#!/bin/sh

. ../scripts/envsetup.sh

$RUN_DEBUG$BIN_HOME/dmzAppQt -f config/render.xml config/resource.xml config/runtime.xml config/common.xml config/audio.xml config/input.xml config/cycle.xml config/game.xml config/lua.xml config/cycle_yellow.xml config/mcp.xml config/drone.xml config/cycle_overlay.xml config/net.xml
