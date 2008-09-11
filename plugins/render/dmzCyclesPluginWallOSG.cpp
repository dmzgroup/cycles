#include "dmzCyclesPluginWallOSG.h"
#include <dmzObjectAttributeMasks.h>
#include <dmzObjectConsts.h>
#include <dmzObjectModule.h>
#include <dmzRenderModuleCoreOSG.h>
#include <dmzRuntimeConfigToBase.h>
#include <dmzRuntimeDefinitions.h>
#include <dmzRuntimeObjectType.h>
#include <dmzRuntimePluginFactoryLinkSymbol.h>
#include <dmzRuntimePluginInfo.h>
#include <dmzTypesVector.h>

#include <osg/Material>

dmz::CyclesPluginWallOSG::CyclesPluginWallOSG (const PluginInfo &Info, Config &local) :
      Plugin (Info),
      TimeSlice (Info),
      ObjectObserverUtil (Info, local),
      _log (Info),
      _defaultHandle (0),
      _core (0) {

   _init (local);
}


dmz::CyclesPluginWallOSG::~CyclesPluginWallOSG () {

   _deadTable.empty ();
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


// Time Slice Interface
void
dmz::CyclesPluginWallOSG::update_time_slice (const Float64 DeltaTime) {

   HashTableHandleIterator it;

   ObjectStruct *os (_objectTable.get_first (it));

   while (os) {
#if 0
      (*(os->verts))[2] = osg::Vec3 (os->pos.get_x (), os->WallInfo.Height, os->pos.get_z ());
      (*(os->verts))[3] = osg::Vec3 (os->pos.get_x (), 0.0f, os->pos.get_z ());
      osg::Vec3Array* normals = (osg::Vec3Array *)os->wall->getNormalArray ();
      osg::Vec3 v1 = (*(os->verts))[1] - (*(os->verts))[0];
      osg::Vec3 v2 = (*(os->verts))[3] - (*(os->verts))[0];
      Vector vv1 (v1.x (), v1.y (), v1.z ());
      Vector vv2 (v2.x (), v2.y (), v2.z ());
      Vector cross = vv1.cross (vv2).normalize ();
//_log.error << vv1 << " " << vv2 << " " << cross << endl;
      (*normals)[0] = osg::Vec3 (cross.get_x (), cross.get_y (), cross.get_z ());
#endif
      

      os->wall->dirtyDisplayList ();
      os->wall->dirtyBound ();

      os->posPrev = os->pos;
      os->velPrev = os->vel;

      os  = _objectTable.get_next (it);
   }

   os = _deadTable.get_first (it);

   while (os) {

      os  = _deadTable.get_next (it);
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

      if (!wall && current.get_config ().lookup_all_config_merged ("wall", wallDef)) {

         const Float32 Red (config_to_float32 ("color.r", wallDef, 1.0));
         const Float32 Green (config_to_float32 ("color.g", wallDef, 1.0));
         const Float32 Blue (config_to_float32 ("color.b", wallDef, 1.0));
         const Float32 Alpha (config_to_float32 ("color.a", wallDef, 1.0));
         const Float32 Height (config_to_float32 ("height", wallDef, 2.0));
         const Float32 Offset (config_to_float32 ("offset", wallDef, 2.0));

_log.error << Red << " " << Green << " " << Blue << " " << Alpha << endl;
         wall = new WallStruct (
            True,
            osg::Vec4 (Red, Green, Blue, Alpha),
            Height,
            Offset);

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

      wall = new WallStruct (False, osg::Vec4 (0.0f, 0.0f, 0.0f, 0.0f), 0.0f, 0.0f);

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

         if (dgroup) { dgroup->removeChild (os->xform.get ()); }
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

   const Boolean IsDead (Value.contains (_deadState));  
   const Boolean WasDead (PreviousValue ? PreviousValue->contains (_deadState) : False);  

   if (IsDead && !WasDead) {

      ObjectStruct *os (_objectTable.remove (ObjectHandle));

      if (os && !_deadTable.store (ObjectHandle, os)) {

         _remove_wall (*os);
         delete os; os = 0;
      }
   }
   else if (WasDead && !IsDead) {

      ObjectModule *objMod (get_object_module ());

      if (objMod) {

         create_object (
            Identity,
            ObjectHandle,
            objMod->lookup_object_type (ObjectHandle),
            objMod->lookup_locality (ObjectHandle));
      }
   }
}


void
dmz::CyclesPluginWallOSG::update_object_position (
      const UUID &Identity,
      const Handle ObjectHandle,
      const Handle AttributeHandle,
      const Vector &Value,
      const Vector *PreviousValue) {

   ObjectStruct *os (_objectTable.lookup (ObjectHandle));

   if (os) { os->pos = Value; os->posPrev = (PreviousValue ? *PreviousValue : Value); }
}


void
dmz::CyclesPluginWallOSG::update_object_velocity (
      const UUID &Identity,
      const Handle ObjectHandle,
      const Handle AttributeHandle,
      const Vector &Value,
      const Vector *PreviousValue) {

   ObjectStruct *os (_objectTable.lookup (ObjectHandle));

   const Vector Normalized (Value.normalize ());

   if (os) {

      os->vel = Normalized;
      os->velPrev = (PreviousValue ? PreviousValue->normalize () : Normalized);
   }
}


void
dmz::CyclesPluginWallOSG::_create_wall (
      const Handle ObjectHandle,
      const WallStruct &Wall) {

   ObjectStruct *os (new ObjectStruct (Wall));

   if (_core && os && _objectTable.store (ObjectHandle, os)) {

      ObjectModule *objMod (get_object_module ());

      if (objMod) {

         objMod->lookup_position (ObjectHandle, _defaultHandle, os->lastCorner);
         os->pos = os->posPrev = os->lastCorner;
         objMod->lookup_velocity (ObjectHandle, _defaultHandle, os->vel);
         os->velPrev = os->vel;
      }

      os->xform = new osg::MatrixTransform;
      os->geod = new osg::Geode;
      os->wall = new osg::Geometry;
      os->verts = new osg::Vec3Array;
      os->normals = new osg::Vec3Array;
      os->draw = new osg::DrawArrays (GL_TRIANGLE_STRIP, 0, 0);

      os->xform->addChild (os->geod.get ());

      osg::ref_ptr<osg::StateSet> set = os->wall->getOrCreateStateSet ();
      osg::ref_ptr<osg::Material> mat = new osg::Material;
      mat->setEmission (osg::Material::FRONT_AND_BACK, Wall.Color);
      set->setAttributeAndModes (mat.get ());

      //const Float32 TheX (os->lastCorner.get_x ());
      //const Float32 TheZ (os->lastCorner.get_z ());
      //os->verts->push_back (osg::Vec3 (TheX, 0.0f, TheZ));
      //os->verts->push_back (osg::Vec3 (TheX, Wall.Height, TheZ));
      //os->verts->push_back (osg::Vec3 (TheX, Wall.Height, TheZ));
      //os->verts->push_back (osg::Vec3 (TheX, 0.0f, TheZ));
      //os->normals->push_back (osg::Vec3 (1.0f, 0.0f, 0.0f));
      //os->normals->push_back (osg::Vec3 (1.0f, 0.0f, 0.0f));

      os->wall->setNormalArray (os->normals.get ());
      os->wall->setNormalBinding (osg::Geometry::BIND_PER_PRIMITIVE);

      osg::ref_ptr<osg::Vec4Array> color = new osg::Vec4Array;
      color->push_back (Wall.Color);
      os->wall->setColorArray (color.get ());
      os->wall->setColorBinding (osg::Geometry::BIND_OVERALL);

      os->wall->setVertexArray (os->verts.get ());
      os->wall->addPrimitiveSet (os->draw.get ());

      os->geod->addDrawable (os->wall.get ());

      osg::Group *dgroup (_core->get_dynamic_objects ());
      if (dgroup) { dgroup->addChild (os->xform.get ()); }
      else { _log.error << "Failed to add geode!" << endl; }

   }
   else if (os) { delete os; os = 0; }
}


void
dmz::CyclesPluginWallOSG::_remove_wall (ObjectStruct &obj) {

   if (_core) {

      osg::Group *dgroup (_core->get_dynamic_objects ());

      if (dgroup) { dgroup->removeChild (obj.xform.get ()); }
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

   Definitions defs (get_plugin_runtime_context ());

   defs.lookup_state (
      config_to_string ("state.dead", local, DefaultStateNameDead),
      _deadState);

   _defaultHandle = defs.create_named_handle (ObjectAttributeDefaultName);
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
