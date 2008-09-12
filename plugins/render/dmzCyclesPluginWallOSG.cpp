#include "dmzCyclesPluginWallOSG.h"
#include <dmzObjectAttributeMasks.h>
#include <dmzObjectConsts.h>
#include <dmzObjectModule.h>
#include <dmzRenderModuleCoreOSG.h>
#include <dmzRenderObjectDataOSG.h>
#include <dmzRenderUtilOSG.h>
#include <dmzRuntimeConfigToBase.h>
#include <dmzRuntimeDefinitions.h>
#include <dmzRuntimeObjectType.h>
#include <dmzRuntimePluginFactoryLinkSymbol.h>
#include <dmzRuntimePluginInfo.h>
#include <dmzTypesVector.h>

#include <math.h>

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
      
      if (!os->dir.is_zero () && !os->dirPrev.is_zero ()) {

         if (os->triCount <= 0) {

            os->verts->push_back (osg::Vec3 (os->pos.get_x (), 0.0, os->pos.get_z ()));
            os->verts->push_back (
               osg::Vec3 (os->pos.get_x (), os->WallInfo.Height, os->pos.get_z ()));

            os->verts->push_back (osg::Vec3 (os->pos.get_x (), 0.0, os->pos.get_z ()));
            os->verts->push_back (
               osg::Vec3 (os->pos.get_x (), os->WallInfo.Height, os->pos.get_z ()));

            os->triCount = 2;

            os->draw->setCount (os->triCount + 2);
            osg::Vec3 normal (os->dir.get_z (), 0.0, os->dir.get_x ());
            os->normals->push_back (normal);
            os->normals->push_back (normal);
            os->lastCorner = os->pos;
         }
         else {

            const Float64 Dot (os->dir.dot (os->dirPrev));

            if (!is_zero64 (Dot - 1.0)) {

               const Vector Previous (os->dirPrev * os->dirPrev);
               const Vector Current (os->dir * os->dir);

               osg::Vec3 pos (
                  (os->pos.get_x () * Previous.get_x ()) +
                     (os->posPrev.get_x () * Current.get_x ()),
                  0.0f,
                  (os->pos.get_z () * Previous.get_z ()) +
                     (os->posPrev.get_z () * Current.get_z ()));

               (*(os->verts))[os->triCount] = pos;
               os->verts->push_back (pos);

               pos.y () = os->WallInfo.Height;

               (*(os->verts))[os->triCount + 1] = pos;
               os->verts->push_back (pos);

               os->triCount += 2;

               os->draw->setCount (os->triCount + 2);
               osg::Vec3 normal (os->dir.get_z (), 0.0, os->dir.get_x ());
               os->normals->push_back (normal);
               os->normals->push_back (normal);
               os->lastCorner.set_xyz (pos.x (), 0.0, pos.z ());
            }
         }

         if ((os->pos - os->lastCorner).magnitude () > os->WallInfo.Offset) {

            Vector pos (os->pos - (os->dir * os->WallInfo.Offset));
            (*(os->verts))[os->triCount] =
               osg::Vec3 (pos.get_x (), 0.0f, pos.get_z ());
            (*(os->verts))[os->triCount + 1] =
               osg::Vec3 (pos.get_x (), os->WallInfo.Height, pos.get_z ());

            os->wall->dirtyDisplayList ();
            os->wall->dirtyBound ();
         }

         os->posPrev = os->pos;
         os->dirPrev = os->dir;
      }

      os  = _objectTable.get_next (it);
   }

   os = _deadTable.get_first (it);

   while (os) {

      if (os->wallYOffset < (-os->WallInfo.Height)) {

         ObjectStruct *tmp = _deadTable.remove (it.get_hash_key ());
         if (tmp) { _remove_wall (*tmp); delete tmp; tmp = 0; }
      }
      else {

         os->wallYOffset -= 2.0 * DeltaTime;
         os->xform->setMatrix (
            to_osg_matrix (Matrix (), Vector (0.0, os->wallYOffset, 0.0)));
      }

      os  = _deadTable.get_next (it);
   }
}


// Object Observer Interface
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

   const Boolean IsOn (Value.contains (_engineOnState));  
   const Boolean WasOn (PreviousValue ? PreviousValue->contains (_engineOnState) : False);

   if ((IsDead && !WasDead) || (!IsOn && WasOn)) {

      ObjectStruct *os (_objectTable.remove (ObjectHandle));

      if (os && !_deadTable.store (ObjectHandle, os)) {

         _remove_wall (*os);
         delete os; os = 0;
      }
   }
   else if (IsOn && !WasOn) {

      ObjectModule *objMod (get_object_module ());

      if (objMod) {

         _create_object_wall (ObjectHandle, objMod->lookup_object_type (ObjectHandle));
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

      os->dir = Normalized;
      os->dirPrev = (PreviousValue ? PreviousValue->normalize () : Normalized);
      if (os->dirPrev.is_zero ()) { os->dirPrev = os->dir; }
   }
}


void
dmz::CyclesPluginWallOSG::_create_object_wall (
      const Handle ObjectHandle,
      const ObjectType &Type) {

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
         const Float32 Height (config_to_float32 ("height", wallDef, 1.8));
         const Float32 Offset (config_to_float32 ("offset", wallDef, 3.0));

         _log.info << " " << Type.get_name () << " wall information." << endl
            << "\t   Red : " << Red << endl
            << "\t Green : " << Green << endl
            << "\t  Blue : " << Blue << endl
            << "\t Alpha : " << Alpha << endl
            << "\tHeight : " << Height << endl
            << "\tOffset : " << Offset << endl;

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
dmz::CyclesPluginWallOSG::_create_wall (
      const Handle ObjectHandle,
      const WallStruct &Wall) {

   ObjectStruct *os (new ObjectStruct (Wall));

   if (_core && os && _objectTable.store (ObjectHandle, os)) {

      ObjectModule *objMod (get_object_module ());

      if (objMod) {

         objMod->lookup_position (ObjectHandle, _defaultHandle, os->lastCorner);
         os->pos = os->posPrev = os->lastCorner;
         objMod->lookup_velocity (ObjectHandle, _defaultHandle, os->dir);
         os->dirPrev = os->dir = os->dir.normalize ();
      }

      os->xform = new osg::MatrixTransform;
      os->xform->setUserData (new RenderObjectDataOSG (ObjectHandle));
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
      ObjectDestroyMask |
      ObjectPositionMask |
      ObjectVelocityMask |
      ObjectStateMask);

   Definitions defs (get_plugin_runtime_context ());

   defs.lookup_state (
      config_to_string ("state.dead", local, DefaultStateNameDead),
      _deadState);

   defs.lookup_state (
      config_to_string ("state.engine_on", local, "Engine_On"),
      _engineOnState);

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
