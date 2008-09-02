#!/bin/sh

. ../scripts/envsetup.sh

if [ "$1" = "" ] ; then
   export EXTRA_FILE=config/cycle_blue.xml ;
fi

$BIN_HOME/dmzAppQt -f config/runtime.xml config/common.xml config/input.xml config/net.xml config/render.xml config/cycle.xml config/game.xml config/lua.xml $* $EXTRA_FILE
