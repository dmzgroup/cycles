#!/bin/sh

. ../scripts/envsetup.sh

$BIN_HOME/dmzAppQt -f config/runtime.xml config/common.xml config/net.xml config/lua.xml config/mcp.xml $*
