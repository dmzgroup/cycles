#include "cyclesInit.h"
#include <dmzApplication.h>
#include <dmzAppShellExt.h>
#include <dmzCommandLine.h>
#include <dmzRuntimeConfig.h>
#include <dmzRuntimeConfigToTypesBase.h>
#include <dmzRuntimePluginFactoryLinkSymbol.h>
#include <dmzTypesHashTableStringTemplate.h>

#include <QtCore/QUrl>
#include <QtGui/QDesktopServices>

using namespace dmz;

namespace {

typedef HashTableStringTemplate<String> FileTable;
typedef HashTableStringTemplate<Config> ConfigTable;

static void
local_populate_color_table (
      AppShellInitStruct &init,
      CyclesInit &ci,
      FileTable &colorTable) {

   Config colorList;

   if (init.manifest.lookup_all_config ("color.config", colorList)) {

      ConfigIterator it;
      Config color;

      while (colorList.get_next_config (it, color)) {

         String value = config_to_string ("text", color);
         String file = config_to_string ("file", color);

         if (value && file) {

            ci.ui.colorCombo->addItem (value.get_buffer ());
            String *filePtr = new String (file);

            if (!colorTable.store (value, filePtr) && filePtr) {

               delete filePtr; filePtr = 0;
            }
         }
      }
   }
}


static void
local_populate_resolution_table (
      AppShellInitStruct &init,
      CyclesInit &ci,
      ConfigTable &rezTable) {

   Config rezList;

   if (init.manifest.lookup_all_config ("screen.resolution", rezList)) {

      ConfigIterator it;
      Config rez;

      while (rezList.get_next_config (it, rez)) {

         String value = config_to_string ("text", rez);

         if (value) {

            ci.ui.resolutionCombo->addItem (value.get_buffer ());

            Config *ptr = new Config (rez);

            if (!rezTable.store (value, ptr) && ptr) {

               delete ptr; ptr = 0;
            }
         }
      }
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
      CyclesInit &ci,
      ConfigTable &rezTable) {

   Config global;

   init.app.get_global_config (global);

   Config *ptr = rezTable.lookup (qPrintable (ci.ui.resolutionCombo->currentText ()));

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

      const String Screen = qPrintable (ci.ui.screenBox->cleanText ());

      global.store_attribute (ScreenScope, Screen);
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

CyclesInit::CyclesInit (AppShellInitStruct &theInit) : init (theInit) {

   ui.setupUi (this);
}


CyclesInit::~CyclesInit () {

}


void
CyclesInit::on_buttonBox_rejected () {

   init.app.quit ("Cancel Button Pressed");
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


extern "C" {

DMZ_PLUGIN_FACTORY_LINK_SYMBOL void
dmz_init_cycles (AppShellInitStruct &init) {

   CyclesInit ci (init);

   FileTable colorTable;

   local_populate_color_table (init, ci, colorTable);

   ConfigTable rezTable;

   local_populate_resolution_table (init, ci, rezTable);

   ci.show ();
   ci.raise ();

   while (ci.isVisible ()) {

      // wait for log window to close
      QApplication::sendPostedEvents (0, -1);
      QApplication::processEvents (QEventLoop::WaitForMoreEvents);
   }

   if (init.app.is_running ()) {

      local_add_config ("config", init);

      Boolean multiplayer = False;
      Int32 droneCount = 0;

      if (ci.ui.netBox->checkState () == Qt::Checked) {

         multiplayer = True;
         local_add_config ("multi-player.config", init);

         if (ci.ui.mcpBox->checkState () == Qt::Checked) {

            local_add_config ("multi-player.mcp.config", init);
         }

         droneCount = ci.ui.droneBox->value ();

         if (droneCount > 0) { local_add_config ("multi-player.drone.config", init); }
      }
      else { local_add_config ("single-player.config", init); }

      String *colorPtr = colorTable.lookup (
         qPrintable (ci.ui.colorCombo->currentText ()));

      if (colorPtr) { init.files.append_arg (*colorPtr); }

      CommandLine cl;
      cl.add_args (init.files);
      init.app.process_command_line (cl);

      if (!init.app.is_error ()) {

         local_setup_resolution (init, ci, rezTable);

         if (multiplayer) {

            local_set_drone_count (droneCount, init);
            local_set_port (ci.ui.portBox->value (), init);
         }
      }
   }
}

};
