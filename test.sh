#!/bin/sh

. ../scripts/envsetup.sh

$BIN_HOME/dmzAppQt -f config/runtime.xml config/common.xml config/audio.xml config/input.xml config/net.xml config/render.xml config/simple.xml config/event.xml config/lua.xml $*
