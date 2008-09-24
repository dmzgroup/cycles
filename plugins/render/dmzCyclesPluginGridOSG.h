#ifndef DMZ_RENDER_PLUGIN_LOGO_OSG_DOT_H
#define DMZ_RENDER_PLUGIN_LOGO_OSG_DOT_H

#include <dmzRuntimeLog.h>
#include <dmzRuntimePlugin.h>
#include <dmzRuntimeResources.h>

#include <osg/Camera>

namespace dmz {

   class RenderModuleCoreOSG;

   class CyclesPluginGridOSG : public Plugin {

      public:
         CyclesPluginGridOSG (const PluginInfo &Info, Config &local);
         ~CyclesPluginGridOSG ();

         // Plugin Interface
         virtual void update_plugin_state (
            const PluginStateEnum State,
            const UInt32 Level);

         virtual void discover_plugin (
            const PluginDiscoverEnum Mode,
            const Plugin *PluginPtr);

      protected:
         void _create_grid ();
         void _init (Config &local);

         Log _log;
         Resources _rc;

         String _imageResource;
         Float32 _tileSize;
         Float32 _minGrid;
         Float32 _maxGrid;

         RenderModuleCoreOSG *_core;

      private:
         CyclesPluginGridOSG ();
         CyclesPluginGridOSG (const CyclesPluginGridOSG &);
         CyclesPluginGridOSG &operator= (const CyclesPluginGridOSG &);

   };
};

#endif // DMZ_RENDER_PLUGIN_LOGO_OSG_DOT_H
