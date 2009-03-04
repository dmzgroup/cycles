#!/bin/sh

. ../scripts/envsetup.sh

if [ "$1" = "" ] ; then
   export EXTRA_FILE=config/cycle_red.xml ;
fi

$RUN_DEBUG$BIN_HOME/dmzAppQt -f config/resource.xml config/runtime.xml config/common.xml config/audio.xml config/input.xml config/net.xml config/render.xml config/cycle_overlay.xml config/cycle.xml config/game.xml config/lua.xml $* $EXTRA_FILE
