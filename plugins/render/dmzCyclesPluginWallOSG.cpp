#include "dmzCyclesPluginWallOSG.h"
#include <dmzObjectAttributeMasks.h>
#include <dmzRenderModuleCoreOSG.h>
#include <dmzRuntimeConfigToBase.h>
#include <dmzRuntimeDefinitions.h>
#include <dmzRuntimeObjectType.h>
#include <dmzRuntimePluginFactoryLinkSymbol.h>
#include <dmzRuntimePluginInfo.h>

dmz::CyclesPluginWallOSG::CyclesPluginWallOSG (const PluginInfo &Info, Config &local) :
      Plugin (Info),
      ObjectObserverUtil (Info, local),
      _log (Info),
      _core (0) {

   _init (local);
}


dmz::CyclesPluginWallOSG::~CyclesPluginWallOSG () {

   _objectTable.empty ();
   _wallTable.empty ();
}


// Plugin Interface
void
dmz::CyclesPluginWallOSG::update_plugin_state (
      const PluginStateEnum State,
      const UInt32 Level) {

   if (State == PluginStateInit) {

   }
   else if (State == PluginStateStart) {

   }
   else if (State == PluginStateStop) {

   }
   else if (State == PluginStateShutdown) {

   }
}


void
dmz::CyclesPluginWallOSG::discover_plugin (
      const PluginDiscoverEnum Mode,
      const Plugin *PluginPtr) {

   if (Mode == PluginDiscoverAdd) {

      if (!_core) { _core = RenderModuleCoreOSG::cast (PluginPtr); }
   }
   else if (Mode == PluginDiscoverRemove) {

      if (_core && (_core == RenderModuleCoreOSG::cast (PluginPtr))) { _core = 0; }
   }
}


// Object Observer Interface
void
dmz::CyclesPluginWallOSG::create_object (
      const UUID &Identity,
      const Handle ObjectHandle,
      const ObjectType &Type,
      const ObjectLocalityEnum Locality) {

   WallStruct *wall (0);

   ObjectType current (Type);

   while (current && !wall) {

      wall = _wallTable.lookup (Type.get_handle ());

      Config wallDef;

      if (wall) {} // Do nothing
      else if (current.get_config ().lookup_all_config_merged ("wall", wallDef)) {

         const Float32 Red (config_to_float32 ("color.r", wallDef, 1.0));
         const Float32 Green (config_to_float32 ("color.g", wallDef, 1.0));
         const Float32 Blue (config_to_float32 ("color.b", wallDef, 1.0));
         const Float32 Alpha (config_to_float32 ("color.a", wallDef, 1.0));
         const Float32 Height (config_to_float32 ("height", wallDef, 1.0));

         wall = new WallStruct (
            True,
            osg::Vec4 (Red, Green, Blue, Alpha),
            Height);

         if (wall && !_wallTable.store (Type.get_handle (), wall)) {

            delete wall; wall = 0;
         }
      }
      else { current.become_parent (); }
   }

   if (wall && wall->ColorDefined) {

      _create_wall (ObjectHandle, *wall);
   }
   else if (!wall) {

      wall = new WallStruct (False, osg::Vec4 (0.0f, 0.0f, 0.0f, 0.0f), 0.0);

      if (wall && !_wallTable.store (Type.get_handle (), wall)) {

         delete wall; wall = 0;
      }
   }
}


void
dmz::CyclesPluginWallOSG::destroy_object (
      const UUID &Identity,
      const Handle ObjectHandle) {

   ObjectStruct *os (_objectTable.remove (ObjectHandle));

   if (os) {

      if (_core) {

         osg::Group *dgroup (_core->get_dynamic_objects ());

         if (dgroup) { dgroup->removeChild (os->d.get ()); }
      }

      delete os; os = 0;
   }
}


void
dmz::CyclesPluginWallOSG::update_object_state (
      const UUID &Identity,
      const Handle ObjectHandle,
      const Handle AttributeHandle,
      const Mask &Value,
      const Mask *PreviousValue) {

}


void
dmz::CyclesPluginWallOSG::update_object_position (
      const UUID &Identity,
      const Handle ObjectHandle,
      const Handle AttributeHandle,
      const Vector &Value,
      const Vector *PreviousValue) {

}


void
dmz::CyclesPluginWallOSG::update_object_velocity (
      const UUID &Identity,
      const Handle ObjectHandle,
      const Handle AttributeHandle,
      const Vector &Value,
      const Vector *PreviousValue) {

}


void
dmz::CyclesPluginWallOSG::_create_wall (
      const Handle ObjectHandle,
      const WallStruct &Wall) {

   if (_core) {

      osg::Group *dgroup (_core->get_dynamic_objects ());
      ObjectStruct *os (new ObjectStruct (Wall));

      if (os && _objectTable.store (ObjectHandle, os)) {
         os->d = new osg::MatrixTransform;
         osg::Geode *g (new osg::Geode);
         os->wall = new osg::Geometry;
         os->d->addChild (g);
         g->addDrawable (os->wall.get ());
      }
      else if (os) { delete os; os = 0; }
   }
}


void
dmz::CyclesPluginWallOSG::_init (Config &local) {

   activate_default_object_attribute (
      ObjectCreateMask |
      ObjectDestroyMask |
      ObjectPositionMask |
      ObjectVelocityMask |
      ObjectStateMask);
}


extern "C" {

DMZ_PLUGIN_FACTORY_LINK_SYMBOL dmz::Plugin *
create_dmzCyclesPluginWallOSG (
      const dmz::PluginInfo &Info,
      dmz::Config &local,
      dmz::Config &global) {

   return new dmz::CyclesPluginWallOSG (Info, local);
}

};
