#!/bin/sh

. ../scripts/envsetup.sh

$RUN_DEBUG$BIN_HOME/dmzAppQt -f config/audio.xml config/resource.xml config/runtime.xml config/common.xml config/js.xml config/input.xml config/net.xml config/render.xml  $*
