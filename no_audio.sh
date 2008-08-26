#!/bin/sh

. ../scripts/envsetup.sh

if [ "$1" = "" ] ; then
   export EXTRA_FILE=config/cycle_red.xml ;
fi

$BIN_HOME/dmzAppQt -f config/runtime.xml config/common.xml config/input.xml config/net.xml config/render.xml config/simple.xml config/event.xml config/lua.xml $* $EXTRA_FILE
