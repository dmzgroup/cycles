#!/bin/sh

. ../scripts/envsetup.sh

$RUN_DEBUG$BIN_HOME/dmzAppQt -f config/resource.xml config/runtime.xml config/common.xml config/net.xml  config/mcp.xml config/js.xml $*
