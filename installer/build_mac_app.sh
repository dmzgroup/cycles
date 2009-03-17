#!/bin/sh
DEPTH=../../..
lmk -m opt -b
cp -r $DEPTH/bin/macos-opt/cycles.app $DEPTH
mkdir $DEPTH/cycles.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/QtCore $DEPTH/cycles.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/QtGui $DEPTH/cycles.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/QtXml $DEPTH/cycles.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/QtSvg $DEPTH/cycles.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/QtOpenGL $DEPTH/cycles.app/Contents/Frameworks/Qt
OSGDIR=$DEPTH/cycles.app/Contents/Frameworks/osg
OSGPLUGINDIRPRE=$DEPTH/cycles.app/Contents/PlugIns/
OSGPLUGINDIR=$DEPTH/cycles.app/Contents/PlugIns/osgPlugins-2.8.0
#OSGPLUGINDIR=$OSGDIR/osgPlugins-2.6.1
mkdir $OSGDIR
mkdir $OSGPLUGINDIRPRE
mkdir $OSGPLUGINDIR
cp $DEPTH/depend/osg/lib/libosg.dylib $OSGDIR
cp $DEPTH/depend/osg/lib/libosgSim.dylib $OSGDIR
cp $DEPTH/depend/osg/lib/libosgGA.dylib $OSGDIR
cp $DEPTH/depend/osg/lib/libosgViewer.dylib $OSGDIR
cp $DEPTH/depend/osg/lib/libosgUtil.dylib $OSGDIR
cp $DEPTH/depend/osg/lib/libOpenThreads.dylib $OSGDIR
cp $DEPTH/depend/osg/lib/libosgText.dylib $OSGDIR
cp $DEPTH/depend/osg/lib/libosgTerrain.dylib $OSGDIR
cp $DEPTH/depend/osg/lib/libosgDB.dylib $OSGDIR
cp $DEPTH/depend/osg/lib/libosgFX.dylib $OSGDIR
cp $DEPTH/depend/osg/lib/osgdb_qt.so $OSGPLUGINDIR
cp $DEPTH/depend/osg/lib/osgdb_obj.so $OSGPLUGINDIR
cp $DEPTH/depend/osg/lib/osgdb_ive.so $OSGPLUGINDIR
cp $DEPTH/depend/osg/lib/osgdb_osgfx.so $OSGPLUGINDIR
hdiutil create -srcfolder $DEPTH/cycles.app $DEPTH/cycles-`cat $DEPTH/tmp/macos-opt/mbraapp/buildnumber.txt`.dmg
hdiutil internet-enable -yes -verbose $DEPTH/cycles-`cat $DEPTH/tmp/macos-opt/mbraapp/buildnumber.txt`.dmg
rm -rf $DEPTH/cycles.app/
