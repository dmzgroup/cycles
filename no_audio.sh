#!/bin/sh

. ../scripts/envsetup.sh

if [ "$1" = "" ] ; then
   export EXTRA_FILE=config/cycle_blue.xml ;
fi

$RUN_DEBUG$BIN_HOME/dmzAppQt -f config/resource.xml config/runtime.xml config/common.xml config/input.xml config/net.xml config/render.xml config/cycle.xml config/game.xml  $* $EXTRA_FILE
