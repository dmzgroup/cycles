#!/bin/sh
DEPTH=../../..
lmk -m opt -b
cp -RL $DEPTH/bin/macos-opt/cycles.app $DEPTH
mkdir $DEPTH/cycles.app/Contents/Frameworks/Qt
mkdir $DEPTH/cycles.app/Contents/Frameworks/v8
cp $DEPTH/depend/Qt/QtCore $DEPTH/cycles.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/QtGui $DEPTH/cycles.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/QtXml $DEPTH/cycles.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/QtSvg $DEPTH/cycles.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/QtOpenGL $DEPTH/cycles.app/Contents/Frameworks/Qt
OSGDIR=$DEPTH/cycles.app/Contents/Frameworks/osg
OSGPLUGINDIR=$DEPTH/cycles.app/Contents/PlugIns/
mkdir $OSGDIR
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
cp $DEPTH/depend/osg/lib/osgdb_imageio.so $OSGPLUGINDIR
cp $DEPTH/depend/osg/lib/osgdb_obj.so $OSGPLUGINDIR
cp $DEPTH/depend/osg/lib/osgdb_ive.so $OSGPLUGINDIR
cp $DEPTH/depend/osg/lib/osgdb_osgfx.so $OSGPLUGINDIR
cp $DEPTH/depend/v8/lib/libv8.dylib $DEPTH/cycles.app/Contents/Frameworks/v8
TARGET=$DEPTH/cycles-`cat $DEPTH/tmp/macos-opt/cyclesapp/buildnumber.txt`.dmg
hdiutil create -srcfolder $DEPTH/cycles.app $TARGET
hdiutil internet-enable -yes -verbose $TARGET
rm -rf $DEPTH/cycles.app/
INSTALLER_PATH=$DEPTH/installers
if [ ! -d $INSTALLER_PATH ] ; then
   mkdir $INSTALLER_PATH
fi
mv $TARGET $INSTALLER_PATH
