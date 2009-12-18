#include "cyclesInit.h"
#include <dmzApplication.h>
#include <dmzAppShellExt.h>
#include <dmzFoundationCommandLine.h>
#include <dmzFoundationXMLUtil.h>
#include <dmzQtConfigRead.h>
#include <dmzQtConfigWrite.h>
#include <dmzRuntimeConfig.h>
#include <dmzRuntimeConfigToTypesBase.h>
#include <dmzRuntimePluginFactoryLinkSymbol.h>
#include <dmzRuntimeSession.h>
#include <dmzRuntimeVersion.h>
#include <dmzTypesHashTableStringTemplate.h>

#include <QtCore/QUrl>
#include <QtGui/QCloseEvent>
#include <QtGui/QDesktopServices>
#include <QtGui/QDesktopWidget>

using namespace dmz;

namespace {

typedef HashTableStringTemplate<String> FileTable;
typedef HashTableStringTemplate<Config> ConfigTable;

static const String CyclesName ("cyclesInit");
static const String ColorName ("color.value");
static const String ResolutionName ("resolution.value");
static const String ScreenName ("screen.value");
static const String AAName ("aa.value");
static const String MultiplayerName ("multiplayer.value");
static const String DronesName ("drones.value");
static const String PortName ("port.value");
static const String MCPName ("mcp.value");
static const String GeometryName ("geometry");

static void
local_populate_color_table (
      AppShellInitStruct &init,
      CyclesInit &cInit,
      ConfigTable &colorTable) {

   Config colorList;

   if (init.manifest.lookup_all_config ("color.type", colorList)) {

      ConfigIterator it;
      Config color;

      while (colorList.get_next_config (it, color)) {

         String value = config_to_string ("text", color);

         if (value) {

            cInit.ui.colorCombo->addItem (value.get_buffer ());
            Config *ptr = new Config (color);

            if (ptr && !colorTable.store (value, ptr)) {

               delete ptr; ptr = 0;
            }
         }
      }
   }
}


static void
local_populate_resolution_table (
      AppShellInitStruct &init,
      CyclesInit &cInit,
      ConfigTable &rezTable) {

   Config rezList;

   if (init.manifest.lookup_all_config ("screen.resolution", rezList)) {

      ConfigIterator it;
      Config rez;

      while (rezList.get_next_config (it, rez)) {

         String value = config_to_string ("text", rez);

         if (value) {

            cInit.ui.resolutionCombo->addItem (value.get_buffer ());

            Config *ptr = new Config (rez);

            if (!rezTable.store (value, ptr) && ptr) {

               delete ptr; ptr = 0;
            }
         }
      }
   }
}


static void
local_restore_session (AppShellInitStruct &init, CyclesInit &cInit) {

   Config session = get_session_config (CyclesName, init.app.get_context ());

   const String Color = config_to_string (ColorName, session);

   if (Color) {

      const int Index = cInit.ui.colorCombo->findText (Color.get_buffer ());
      if (Index >= 0) { cInit.ui.colorCombo->setCurrentIndex (Index); }
   }

   const String Resolution = config_to_string (ResolutionName, session);

   if (Resolution) {

      const int Index = cInit.ui.resolutionCombo->findText (Resolution.get_buffer ());
      if (Index >= 0) { cInit.ui.resolutionCombo->setCurrentIndex (Index); }
   }

   const Int32 Screen = config_to_int32 (ScreenName, session, -1);
   if (Screen >= 0) { cInit.ui.screenBox->setValue (Screen); }

   const Int32 Samples = config_to_int32 (AAName, session, -1);
   if (Samples >= 0) { cInit.ui.aaBox->setValue (Samples); }

   if (config_to_boolean (MultiplayerName, session, False)) {

      cInit.ui.netBox->setCheckState (Qt::Checked);
   }

   const Int32 Drones = config_to_int32 (DronesName, session, -1);
   if (Drones > 0) { cInit.ui.droneBox->setValue (Drones); }

   const Int32 Port = config_to_int32 (PortName, session, -1);
   if (Port > 0) { cInit.ui.portBox->setValue (Port); }

   if (config_to_boolean (MCPName, session, False)) {

      cInit.ui.mcpBox->setCheckState (Qt::Checked);
   }

   Config geometry;

   if (session.lookup_config (GeometryName, geometry)) {

      cInit.restoreGeometry (config_to_qbytearray (geometry));
   }
   else {

      QRect rect = QApplication::desktop ()->availableGeometry (&cInit);
      cInit.move(rect.center () - cInit.rect ().center ());
   }
}


static void
local_add_config (const String &Scope, AppShellInitStruct &init) {

   Config configList;

   if (init.manifest.lookup_all_config (Scope, configList)) {

      ConfigIterator it;
      Config config;

      while (configList.get_next_config (it, config)) {

         const String Value = config_to_string ("file", config);

         if (Value) { init.files.append_arg (Value); }
      }
   }
}


static void
local_setup_resolution (
      AppShellInitStruct &init,
      CyclesInit &cInit,
      ConfigTable &rezTable) {

   Config global;

   init.app.get_global_config (global);

   Config *ptr = rezTable.lookup (qPrintable (cInit.ui.resolutionCombo->currentText ()));

   if (ptr) {

      Config attrList;

      ptr->lookup_all_config ("attribute", attrList);

      ConfigIterator it;
      Config attr;

      while (attrList.get_next_config (it, attr)) {

         const String Scope = config_to_string ("scope", attr);
         const String Value = config_to_string ("value", attr);

         if (Scope && Value) { global.store_attribute (Scope, Value); }
      }
   }

   String ScreenScope = config_to_string ("screen.scope", init.manifest);

   if (ScreenScope) {

      const String Screen = qPrintable (cInit.ui.screenBox->cleanText ());

      global.store_attribute (ScreenScope, Screen);
   }

   String AAScope = config_to_string ("aa.scope", init.manifest);

   if (AAScope) {

      const String Samples = qPrintable (cInit.ui.aaBox->cleanText ());

      global.store_attribute (AAScope, Samples);
   }
}


static void
local_set_drone_count (const Int32 DroneCount, AppShellInitStruct &init) {

   Config global;

   init.app.get_global_config (global);

   String DroneScope =
      config_to_string ("drone.scope", init.manifest, "dmz.drone.count.value");

   if (DroneScope) {

      global.store_attribute (DroneScope, String::number (DroneCount));
   }
}


static void
local_set_port (const Int32 Port, AppShellInitStruct &init) {

   Config global;

   init.app.get_global_config (global);

   String PortScope = config_to_string (
      "port.scope",
      init.manifest,
      "dmz.dmzNetModulePacketIOHawkNL.socket.port");

   if (PortScope) {

      global.store_attribute (PortScope, String::number (Port));
   }
}

};

CyclesInit::CyclesInit (AppShellInitStruct &theInit) : init (theInit), _start (False) {

   ui.setupUi (this);
}


CyclesInit::~CyclesInit () {

}


void
CyclesInit::on_buttonBox_accepted () {

   _start = True;
   close ();
}


void
CyclesInit::on_buttonBox_rejected () {

   close ();
}


void
CyclesInit::on_buttonBox_helpRequested () {

   const String UrlValue =
      config_to_string ("help.url", init.manifest, "http://dmzdev.org/wiki/cycles");

   if (UrlValue) {

      QUrl Url (UrlValue.get_buffer ());

      QDesktopServices::openUrl (Url);
   }
}

void
CyclesInit::closeEvent (QCloseEvent * event) {

   if (!_start) {

      init.app.quit ("Cancel Button Pressed");
   }
   else {

      Config session (CyclesName);

      const String Color = qPrintable (ui.colorCombo->currentText ());
      session.store_attribute (ColorName, Color);

      const String Resolution = qPrintable (ui.resolutionCombo->currentText ());
      session.store_attribute (ResolutionName, Resolution);

      const Int32 Screen = ui.screenBox->value ();
      session.store_attribute (ScreenName, String::number (Screen));

      const Int32 Samples = ui.aaBox->value ();
      session.store_attribute (AAName, String::number (Samples));

      const Int32 Drones = ui.droneBox->value ();
      session.store_attribute (DronesName, String::number (Drones));

      const Boolean Multiplayer = ui.netBox->checkState () == Qt::Checked;
      session.store_attribute (MultiplayerName, Multiplayer ? "true" : "false");

      const Int32 Port = ui.portBox->value ();
      session.store_attribute (PortName, String::number (Port));

      const Boolean MCP = ui.mcpBox->checkState () == Qt::Checked;
      session.store_attribute (MCPName, MCP ? "true" : "false");

      session.add_config (qbytearray_to_config ("geometry", saveGeometry ()));

      set_session_config (init.app.get_context (), session);
   }

   event->accept ();
}


extern "C" {

DMZ_PLUGIN_FACTORY_LINK_SYMBOL void
dmz_init_cycles (AppShellInitStruct &init) {

   CyclesInit cInit (init);

   if (init.VersionFile) {

      Version version;

      if (xml_to_version (init.VersionFile, version, &init.app.log)) {

         QString vs = cInit.windowTitle ();
         vs += " (v";
         const String Tmp = version.get_version ().get_buffer ();
         if (Tmp) { vs += Tmp.get_buffer (); }
         else { vs += "Unknown"; }
         vs += ")";

         cInit.setWindowTitle (vs);
      }
   }

   ConfigTable colorTable;

   local_populate_color_table (init, cInit, colorTable);

   ConfigTable rezTable;

   local_populate_resolution_table (init, cInit, rezTable);

   local_restore_session (init, cInit);

   cInit.show ();
   cInit.raise ();

   while (cInit.isVisible ()) {

      // wait for log window to close
      QApplication::sendPostedEvents (0, -1);
      QApplication::processEvents (QEventLoop::WaitForMoreEvents);
   }

   if (init.app.is_running ()) {

      local_add_config ("config", init);

      Boolean multiplayer = False;
      Int32 droneCount = 0;

      if (cInit.ui.netBox->checkState () == Qt::Checked) {

         multiplayer = True;
         local_add_config ("multi-player.config", init);

         if (cInit.ui.mcpBox->checkState () == Qt::Checked) {

            local_add_config ("multi-player.mcp.config", init);
         }

         droneCount = cInit.ui.droneBox->value ();

         if (droneCount > 0) { local_add_config ("multi-player.drone.config", init); }
      }
      else { local_add_config ("single-player.config", init); }

      Config *colorPtr = colorTable.lookup (
         qPrintable (cInit.ui.colorCombo->currentText ()));

      if (colorPtr) {

         Config fileList;

         if (colorPtr->lookup_all_config ("config", fileList)) {

            ConfigIterator it;
            Config file;

            while (fileList.get_next_config (it, file)) {

               init.files.append_arg (config_to_string ("file", file));
            }
         }
      }

      CommandLine cl;
      cl.add_args (init.files);
      init.app.process_command_line (cl);

      if (!init.app.is_error ()) {

         local_setup_resolution (init, cInit, rezTable);

         if (multiplayer) {

            local_set_drone_count (droneCount, init);
            local_set_port (cInit.ui.portBox->value (), init);
         }
      }
   }
}

};
