#!/bin/sh

. ../scripts/envsetup.sh

if [ "$1" = "" ] ; then
   export EXTRA_FILE=config/cycle_red.xml ;
fi

$RUN_DEBUG$BIN_HOME/dmzAppQt -f config/render.xml config/resource.xml config/runtime.xml config/common.xml config/js.xml config/input.xml config/cycle_overlay.xml config/cycle.xml config/game.xml config/lua.xml config/net.xml $* $EXTRA_FILE
