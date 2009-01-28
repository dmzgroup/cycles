#include "cyclesInit.h"
#include <dmzApplication.h>
#include <dmzAppShellExt.h>
#include <dmzCommandLine.h>
#include <dmzRuntimeConfig.h>
#include <dmzRuntimeConfigToTypesBase.h>
#include <dmzRuntimePluginFactoryLinkSymbol.h>

using namespace dmz;

CyclesInit::CyclesInit () {

   ui.setupUi (this);
}


CyclesInit::~CyclesInit () {

}


extern "C" {

DMZ_PLUGIN_FACTORY_LINK_SYMBOL void
dmz_init_cycles (AppShellInitStruct &init) {

   init.app.log.error << "Inside of the init function!" << endl;

   CyclesInit ci;

   ci.show ();
   ci.raise ();

   while (ci.isVisible ()) {

      // wait for log window to close
      QApplication::sendPostedEvents (0, -1);
      QApplication::processEvents ();
   }

   if (init.LaunchFile) {

      Config launchFileConfig ("launch-file");
      launchFileConfig.store_attribute ("name", init.LaunchFile);
      init.app.add_config ("", launchFileConfig);
      init.files.append_arg (init.LaunchFile);
   }

   Config configList;

   if (init.manifest.lookup_all_config ("config", configList)) {

      ConfigIterator it;
      Config config;

      while (configList.get_next_config (it, config)) {

         const String Value = config_to_string ("file", config);

         if (Value) { init.files.append_arg (Value); }
      }

      CommandLine cl;
      cl.add_args (init.files);
      init.app.process_command_line (cl);
   }

}

};
