#include <dmzRenderModuleCoreOSG.h>
#include "dmzCyclesPluginGridOSG.h"
#include <dmzRuntimeConfigToBase.h>
#include <dmzRuntimePluginFactoryLinkSymbol.h>
#include <dmzRuntimePluginInfo.h>

#include <osg/CullFace>
#include <osg/Material>
#include <osg/Geode>
#include <osg/Geometry>
#include <osg/BlendFunc>
#include <osg/Depth>
#include <osg/PolygonOffset>
#include <osg/Matrix>
#include <osg/RenderInfo>
#include <osg/Texture2D>

#include <osgDB/ReadFile>


dmz::CyclesPluginGridOSG::CyclesPluginGridOSG (const PluginInfo &Info, Config &local) :
      Plugin (Info),
      _log (Info),
      _tileSize (250.0),
      _minGrid (-1000.0),
      _maxGrid (1000.0),
      _core (0) {

   _init (local);
}


dmz::CyclesPluginGridOSG::~CyclesPluginGridOSG () {

}


// Plugin Interface
void
dmz::CyclesPluginGridOSG::update_plugin_state (
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
dmz::CyclesPluginGridOSG::discover_plugin (
      const PluginDiscoverEnum Mode,
      const Plugin *PluginPtr) {

   if (Mode == PluginDiscoverAdd) {

      if (!_core) {

         _core = RenderModuleCoreOSG::cast (PluginPtr);

         if (_core) { _create_grid (); }
      }
   }
   else if (Mode == PluginDiscoverRemove) {

      if (_core &&  (_core == RenderModuleCoreOSG::cast (PluginPtr))) { _core = 0; }
   }
}


void
dmz::CyclesPluginGridOSG::_create_grid () {

   const String FoundFile (_core ? _core->find_file (_imageFile) : "");

   osg::ref_ptr<osg::Image> img = osgDB::readImageFile (FoundFile.get_buffer ());

   if (img.valid () && _core) {

      const Int32 GridSize (Int32 ((_maxGrid - _minGrid) / _tileSize));

      const Int32 ArraySize ((GridSize + 1) * (GridSize + 1));

      struct vertex {

         Float32 x, y;
         vertex () : x (0.0f), y (0.0f) {;}
      };

      vertex *gridPoints = new vertex[ArraySize];

      osg::Geode* geode = new osg::Geode ();

      if (gridPoints && geode) {

         for (Int32 ix = 0; ix <= GridSize; ix++) {

            const Float32 TheX ((Float32 (ix) * _tileSize) + _minGrid);

            for (Int32 jy = 0; jy <= GridSize; jy++) {

               const Float32 TheY ((Float32 (jy) * _tileSize) + _minGrid);

               const Int32 Offset ((ix * (GridSize + 1)) + jy);
               gridPoints[Offset].x = TheX;
               gridPoints[Offset].y = TheY;
            }
         }

         osg::Geometry* geom = new osg::Geometry;

         osg::Vec3Array* normals = new osg::Vec3Array;
         normals->push_back (osg::Vec3 (0.0f, 1.0f, 0.0f));
         geom->setNormalArray (normals);
         geom->setNormalBinding (osg::Geometry::BIND_OVERALL);

         osg::Vec4Array* colors = new osg::Vec4Array;
         colors->push_back (osg::Vec4 (1.0f, 1.0, 1.0f, 1.0f));
         geom->setColorArray (colors);
         geom->setColorBinding (osg::Geometry::BIND_OVERALL);

         osg::StateSet *stateset = geom->getOrCreateStateSet ();
         stateset->setMode (GL_BLEND, osg::StateAttribute::ON);

         osg::Vec3Array *vertices = new osg::Vec3Array;
         osg::Vec2Array *tcoords = new osg::Vec2Array;

         osg::Texture2D *tex = new osg::Texture2D (img.get ());
         tex->setWrap (osg::Texture2D::WRAP_S, osg::Texture2D::REPEAT);
         tex->setWrap (osg::Texture2D::WRAP_T, osg::Texture2D::REPEAT);

         stateset->setTextureAttributeAndModes (0, tex, osg::StateAttribute::ON);

         stateset->setAttributeAndModes (new osg::CullFace (osg::CullFace::BACK));

         unsigned int count (0);

         for (Int32 ix = 0; ix < GridSize; ix++) {

            for (Int32 jy = 0; jy < GridSize; jy++) {

               vertex *v (0);

               v = &(gridPoints[(ix * (GridSize + 1)) + jy + 1]);
               vertices->push_back (osg::Vec3 (v->x, 0.0, v->y));
               v = &(gridPoints[((ix + 1) * (GridSize + 1)) + jy + 1]);
               vertices->push_back (osg::Vec3 (v->x, 0.0, v->y));
               v = &(gridPoints[((ix + 1) * (GridSize + 1)) + jy]);
               vertices->push_back (osg::Vec3 (v->x, 0.0, v->y));
               v = &(gridPoints[(ix * (GridSize + 1)) + jy]);
               vertices->push_back (osg::Vec3 (v->x, 0.0, v->y));

               const float Factor (50.0);
               tcoords->push_back (osg::Vec2 (0.0, 0.0));
               tcoords->push_back (osg::Vec2 (0.0, Factor));
               tcoords->push_back (osg::Vec2 (Factor, Factor));
               tcoords->push_back (osg::Vec2 (Factor, 0.0));

               count += 4;
            }
         }

         geom->addPrimitiveSet (new osg::DrawArrays (GL_QUADS, 0, count));

         geom->setVertexArray (vertices);
         geom->setTexCoordArray (0, tcoords);
         geode->addDrawable (geom);

         osg::Group *s = _core->get_static_objects ();

         if (s) { s->addChild (geode); }
         else { _log.error << "Failed to add geode!" << endl; }

         delete []gridPoints;
      }
      else if (gridPoints) { delete []gridPoints; }
   }
}


void
dmz::CyclesPluginGridOSG::_init (Config &local) {

   _imageFile = config_to_string ("image.file", local, "grid.png");
}


extern "C" {

DMZ_PLUGIN_FACTORY_LINK_SYMBOL dmz::Plugin *
create_dmzCyclesPluginGridOSG (
      const dmz::PluginInfo &Info,
      dmz::Config &local,
      dmz::Config &global) {

   return new dmz::CyclesPluginGridOSG (Info, local);
}

};