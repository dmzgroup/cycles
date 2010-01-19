#!/bin/sh

. ../scripts/envsetup.sh

#export CYCLES_LOG=true
export CYCLES_WORKING_DIR=./
$RUN_DEBUG$BIN_HOME/cycles
