var dmz =
      { object: require("dmz/components/object")
      , time: require("dmz/runtime/time")
      , consts: require("const")
      , input: require("dmz/components/input")
      , portal: require("dmz/components/portal")
      , vector: require("dmz/types/vector")
      , defs: require("dmz/runtime/definitions")
      , matrix: require("dmz/types/matrix")
      , util: require("dmz/types/util")
      }

   , CycleList = {}
   , CycleCount = 0
   , StartPoints = []
   , WaitTime = dmz.time.getFrameTime() + 1
   , MaxCycles = self.config.number("cycles.max", 6)
   , MinCycles = self.config.number("cycles.min", 2)
   , MCP = dmz.object.create(dmz.consts.MCPType)
   , AssignPoints = false
   , timeSlice
   , PlayerCount
   , NextStateTime
   , EndTime

   , createStartPoints
   , assignPointsToCycles
   , isAllDrones
   , createStartPoints
   , assignPointsToCycles
   , getStandbyCount
   , getDeadCount
   , setGameState
   , updateTimeSlice
   ;

createStartPoints = function () {
   var Distance = 10
     , Space = 5
     , Offset = Math.floor(MaxCycles / 4) + 1
     , Ident = dmz.matrix.create()
     , HeadingPi = dmz.matrix.create().fromAxisAndAngle(dmz.vector.Up, Math.PI)
     , oddPos = [ -(Space * Offset), 0, Distance ]
     , evenPos = [ -(Space * Offset) + (Space / 2), 0, -Distance ]
     , Odd
     , point
     , ix
     ;

   for (ix = 0; ix < MaxCycles; ix += 1) {
      Odd = (1 == (ix % 2));
      point = {
         index: ix
         , pos: (Odd ? oddPos : evenPos)
         , ori: (Odd ? Ident : HeadingPi)
         , handle: dmz.object.create(dmz.consts.StartPointType)
      };
      StartPoints[ix] = point;
      dmz.object.position(point.handle, null, point.pos);
      dmz.object.orientation(point.handle, null, point.ori);
      // Counter is used to trigger a network send
      dmz.object.counter(point.handle, dmz.consts.StartLinkHandle, 0);
      dmz.object.counter.rollover(point.handle, dmz.consts.StartLinkHandle, true);
      dmz.object.activate(point.handle);
      if (Odd) { oddPos[0] += Space; }
      else { evenPos[0] += Space; }
   }
};

assignPointsToCycles = function () {
   var count = 0
     , cycle
     , setPoint
     ;

   setPoint = function (cycle, count) {
      cycle.point = StartPoints[count];
      dmz.object.link(
         dmz.consts.StartLinkHandle,
         cycle.point.handle,
         cycle.handle);
      // Adding to the objs counter will cause the network rules to
      // send the packet immediately instead of waiting for the one second
      // heartbeat as specified in the net rules for this obj type.
      dmz.object.addToCounter(cycle.point.handle, dmz.consts.StartLinkHandle);
   }

   PlayerCount = 0;
   Object.keys(CycleList).forEach(function (key) {
      cycle = CycleList[key];
      if (cycle.point) {
         dmz.object.unlinkSubObjects(cycle.point.handle, dmz.consts.StartLinkHandle)
         delete cycle.point;
      }
   });

   Object.keys(CycleList).forEach(function (key) {
      cycle = CycleList[key];
      if (count < MaxCycles) {
         if (!cycle.drone) {
            setPoint (cycle, count);
            PlayerCount += 1;
            count += 1;
         }
      }
   });

   Object.keys(CycleList).forEach(function (key) {
      cycle = CycleList[key];
      if (count < MaxCycles) {
         if (cycle.drone) {
            setPoint (cycle, count);
            PlayerCount += 1;
            count += 1;
         }
      }
   });
};

getStandbyCount = function () {
   var result = 0
     , cycle
     ;

   Object.keys(CycleList).forEach(function (key) {
      cycle = CycleList[key];
      if (cycle.point && cycle.standby) { result += 1; }
   });
   return result;
};

getDeadCount = function () {
   var result = 0
     , cycle
     ;

   Object.keys(CycleList).forEach(function (key) {
      cycle = CycleList[key];
      if (cycle.point && cycle.dead) { result += 1; }
   });

   return result;
};

isAllDrones = (self.config.string("drone-free-play.value", "false") === "true") ?
function () { return false; } :
function () {
   var result = true
     , cycle
     ;

   Object.keys(CycleList).forEach(function (key) {
      cycle = CycleList[key];
      if (cycle.point && !cycle.dead && !cycle.drone) { result = false; }
   });
   return result;
};

setGameState = function (mcp, State) {
   var newState = dmz.object.state(mcp);
   newState = newState.unset(dmz.consts.GameStateMask);
   newState = newState.or(State);
   dmz.object.state(mcp, null, newState);
};

updateTimeSlice = function (time) {

   var State = dmz.object.state(MCP)
     , CTime
     ;

   if (State) {
      CTime = dmz.time.getFrameTime();
      if (State.contains(dmz.consts.GameWaiting)) {
         if (AssignPoints) {
            assignPointsToCycles();
            AssignPoints = false;
            WaitTime = CTime + 1;
         }
         if ((WaitTime <= CTime) &&
               (getStandbyCount() == PlayerCount) &&
               (PlayerCount >= MinCycles)) {
            setGameState(MCP, dmz.consts.GameCountdown5);
            NextStateTime = CTime + 1;
         }
      }
      else if (State.contains(dmz.consts.GameActive)) {
         if (EndTime && (EndTime <= CTime)) {
            setGameState(MCP, dmz.consts.GameWaiting);
            EndTime = null;
            WaitTime = CTime + 2;
         }
         else if (!EndTime && (getDeadCount() >= (PlayerCount - 1)
                 || isAllDrones())) {
            EndTime = CTime + 2;
         }
      }
      else if (State.contains(dmz.consts.GameCountdown5)) {
         if (CTime >= NextStateTime) {
            setGameState(MCP, dmz.consts.GameCountdown4);
            NextStateTime = CTime + 1;
         }
      }
      else if (State.contains(dmz.consts.GameCountdown4)) {
         if (CTime >= NextStateTime) {
            setGameState(MCP, dmz.consts.GameCountdown3);
            NextStateTime = CTime + 1;
         }
      }
      else if (State.contains(dmz.consts.GameCountdown3)) {
         if (CTime >= NextStateTime) {
            setGameState(MCP, dmz.consts.GameCountdown2);
            NextStateTime = CTime + 1;
         }
      }
      else if (State.contains(dmz.consts.GameCountdown2)) {
         if (CTime >= NextStateTime) {
            setGameState(MCP, dmz.consts.GameCountdown1);
            NextStateTime = CTime + 1;
         }
      }
      else if (State.contains(dmz.consts.GameCountdown1)) {
         if (CTime >= NextStateTime) {
            setGameState(MCP, dmz.consts.GameActive);
            NextStateTime = CTime + 1;
         }
      }
      else {
         self.log.error("Game in unknown state. Changing to a waiting state");
         setGameState(MCP, dmz.consts.GameWaiting);
      }
   }
};



dmz.object.create.observe(self, function (obj, Type) {
   if (Type.isOfType(dmz.consts.CycleType)) {
      CycleList[obj] =
         { handle: obj
         , drone: dmz.object.flag(obj, dmz.consts.DroneHandle)
         };
      CycleCount += 1;
      AssignPoints = true;
   }
});

dmz.object.destroy.observe(self, function (obj, Type) {
   var cycle = CycleList[obj];
   if (cycle) {
      delete CycleList[obj];
      CycleCount -= 1;
      if (cycle.point) { PlayerCount -= 1; }
      AssignPoints = true;
   }
});

dmz.object.state.observe(self, function (obj, Attribute, State, PreviousState) {
   var cycle = CycleList[obj];
   if (cycle) {
      if (!PreviousState) { PreviousState = dmz.consts.EmptyState; }
      if (State.contains(dmz.consts.Dead) &&
            !PreviousState.contains(dmz.consts.Dead)) {
         cycle.dead = true;
         cycle.standby = false;
      }
      else if (State.contains(dmz.consts.Standby)
            && !PreviousState.contains(dmz.consts.Standby)) {
         cycle.dead = false;
         cycle.standby = true;
      }
      else {
         cycle.dead = false;
         cycle.standby = false;
      }
   }
});

(function () {
   dmz.object.state(MCP, null, dmz.consts.GameWaiting);
   dmz.object.activate(MCP);
   createStartPoints();
}());

timeSlice = dmz.time.setRepeatingTimer(self, updateTimeSlice);
