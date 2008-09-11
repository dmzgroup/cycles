#ifndef DMZ_CYCLES_PLUGIN_WALL_OSG_DOT_H
#define DMZ_CYCLES_PLUGIN_WALL_OSG_DOT_H

#include <dmzObjectObserverUtil.h>
#include <dmzRuntimeLog.h>
#include <dmzRuntimePlugin.h>
#include <dmzRuntimeTimeSlice.h>
#include <dmzTypesHashTableHandleTemplate.h>
#include <dmzTypesMask.h>
#include <dmzTypesVector.h>

#include <osg/Geode>
#include <osg/Geometry>
#include <osg/Group>
#include <osg/MatrixTransform>
#include <osg/ref_ptr>

namespace dmz {

   class RenderModuleCoreOSG;

   class CyclesPluginWallOSG :
         public Plugin,
         public TimeSlice,
         public ObjectObserverUtil {

      public:
         CyclesPluginWallOSG (const PluginInfo &Info, Config &local);
         ~CyclesPluginWallOSG ();

         // Plugin Interface
         virtual void update_plugin_state (
            const PluginStateEnum State,
            const UInt32 Level);

         virtual void discover_plugin (
            const PluginDiscoverEnum Mode,
            const Plugin *PluginPtr);

         // Time Slice Interface
         virtual void update_time_slice (const Float64 DeltaTime);

         // Object Observer Interface
         virtual void create_object (
            const UUID &Identity,
            const Handle ObjectHandle,
            const ObjectType &Type,
            const ObjectLocalityEnum Locality);

         virtual void destroy_object (const UUID &Identity, const Handle ObjectHandle);

         virtual void update_object_state (
            const UUID &Identity,
            const Handle ObjectHandle,
            const Handle AttributeHandle,
            const Mask &Value,
            const Mask *PreviousValue);

         virtual void update_object_position (
            const UUID &Identity,
            const Handle ObjectHandle,
            const Handle AttributeHandle,
            const Vector &Value,
            const Vector *PreviousValue);

         virtual void update_object_velocity (
            const UUID &Identity,
            const Handle ObjectHandle,
            const Handle AttributeHandle,
            const Vector &Value,
            const Vector *PreviousValue);

      protected:
         struct WallStruct {

            const Boolean ColorDefined;
            const osg::Vec4 Color;
            const Float32 Height;
            const Float32 Offset;

            WallStruct (
                  const Boolean IsColorDefined,
                  const osg::Vec4 TheColor,
                  const Float32 TheHeight,
                  const Float32 TheOffset) :
                  ColorDefined (IsColorDefined),
                  Color (TheColor),
                  Height (TheHeight),
                  Offset (TheOffset) {;}
         };

         struct ObjectStruct {

            const WallStruct &WallInfo;
            Vector pos;
            Vector posPrev;
            Vector vel;
            Vector velPrev;
            Vector lastCorner;
            Int32 triCount;
            osg::ref_ptr<osg::MatrixTransform> xform;
            osg::ref_ptr<osg::Geode> geod;
            osg::ref_ptr<osg::Geometry> wall;
            osg::ref_ptr<osg::Vec3Array> verts;
            osg::ref_ptr<osg::Vec3Array> normals;
            osg::ref_ptr<osg::DrawArrays> draw;

            ObjectStruct (const WallStruct &TheWallInfo) :
               WallInfo (TheWallInfo),
               triCount (0) {;}
         };

         void _create_wall (const Handle ObjectHandle, const WallStruct &Wall);
         void _remove_wall (ObjectStruct &obj);
         void _init (Config &local);

         Log _log;
         Mask _deadState;
         HashTableHandleTemplate<ObjectStruct> _objectTable;
         HashTableHandleTemplate<ObjectStruct> _deadTable;
         HashTableHandleTemplate<WallStruct> _wallTable;
         Handle _defaultHandle;
         RenderModuleCoreOSG *_core;

      private:
         CyclesPluginWallOSG ();
         CyclesPluginWallOSG (const CyclesPluginWallOSG &);
         CyclesPluginWallOSG &operator= (const CyclesPluginWallOSG &);

   };
};

#endif // DMZ_CYCLES_PLUGIN_WALL_OSG_DOT_H
