#!/bin/sh

. ../scripts/envsetup.sh

$BIN_HOME/dmzAppQt -f config/resource.xml config/runtime.xml config/common.xml config/audio.xml config/input.xml config/net.xml config/render.xml config/cycle.xml config/game.xml config/lua.xml config/cycle_yellow.xml config/mcp.xml config/drone.xml
