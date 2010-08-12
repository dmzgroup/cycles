, const = require("const")

create_start_points ()
   var Distance = 10
   var Space = 5
   var Offset = math.modf (self.maxCycles / 4) + 1
   var Ident = dmz.matrix.new ()
   var HeadingPi = dmz.matrix.new (dmz.const.Up, Math.Pi)
   var oddPos = { -(Space * Offset), 0, Distance }
   var evenPos = { -(Space * Offset) + (Space / 2), 0, -Distance }
   for (ix = 1, self.maxCycles) {
      var Odd = (1 == math.fmod (ix, 2))
      var point = {
         index = ix,
         pos = (Odd && oddPos || evenPos),
         ori = (Odd && Ident || HeadingPi),
         handle = dmz.object.create (dmz.const.StartPointType),
      }
      self.startPoints[ix] = point
      dmz.object.position (point.handle, nil, point.pos)
      dmz.object.orientation (point.handle, nil, point.ori)
      // Counter is used to trigger a network s}
      dmz.object.counter (point.handle, dmz.const.StartLinkHandle, 0)
      dmz.object.counter_rollover (point.handle, dmz.const.StartLinkHandle, true)
      dmz.object.activate (point.handle)
      dmz.object.set_temporary (point.handle)
      if (Odd) { oddPos[1] = oddPos[1] + Space
      else {evenPos[1] = evenPos[1] + Space
      }
   }
}

assign_points_to_cycles ()
   self.playerCount = 0
   for (obj, cycle in pairs (self.cycleList)) {
      if (cycle.point) {
         dmz.object.unlink_sub_links (cycle.point.handle, dmz.const.StartLinkHandle)
         cycle.point = nil
      else if (cycle.wait) {
      }
   }
   var count = 1
   for (obj, cycle in pairs (self.cycleList)) {
      if (count <= self.maxCycles) {
          cycle.point = self.startPoints[count]
          dmz.object.link (dmz.const.StartLinkHandle, cycle.point.handle, obj)
          // Adding to the objs counter will cause the network rules to
          // s} the packet immediately instead of waiting for (the one second
          // heartbeat as specified in the net rules for (this obj type.
          dmz.object.add_to_counter (cycle.point.handle, dmz.const.StartLinkHandle)
          self.playerCount = self.playerCount + 1
      else
      }
      count = count + 1
   }
}

get_standby_count ()
   var result = 0
   for (obj, cycle in pairs (self.cycleList)) {
      if (cycle.point && cycle.standby) { result = result + 1 }
   }
   return result
}

get_dead_count ()
   var result = 0
   for (obj, cycle in pairs (self.cycleList)) {
      if (cycle.point && cycle.dead) { result = result + 1 }
   }
   return result
}

is_all_drones ()
   var result = true
   for (obj, cycle in pairs (self.cycleList)) {
      if (cycle.point && !cycle.dead && !cycle.drone) { result = false }
   }
   return result
}

set_game_state (mcp, State)
   var newState = dmz.object.state (mcp)
   newState.unset (dmz.const.GameStateMask)
   newState = newState + State
   dmz.object.state (mcp, nil, newState)
}

update_time_slice (time)

   var State = dmz.object.state (self.mcp)

   if (State) {
      var CTime = dmz.time.frame_time ()
      if (State.contains (dmz.const.GameWaiting)) {
         if (self.assignPoints) {
            assign_points_to_cycles ()
            self.assignPoints = false
            self.waitTime = CTime + 1
         }
         if ((self.waitTime <= CTime) and
               (get_standby_count () == self.playerCount) and
               (self.playerCount >= self.minCycles)) {
            set_game_state (self.mcp, dmz.const.GameCountdown5)
            self.nextStateTime = CTime + 1
         }
      else if (State.contains (dmz.const.GameActive)) {
         if (self.}Time && self.}Time <= CTime) {
            set_game_state (self.mcp, dmz.const.GameWaiting)
            self.}Time = nil
            self.waitTime = CTime + 2
         else if (!self.}Time && (get_dead_count () >= (self.playerCount - 1)
                 || is_all_drones ()) ) {
            self.}Time = CTime + 2
         }
      else if (State.contains (dmz.const.GameCountdown5)) {
         if (CTime >= self.nextStateTime) {
            set_game_state (self.mcp, dmz.const.GameCountdown4)
            self.nextStateTime = CTime + 1
         }
      else if (State.contains (dmz.const.GameCountdown4)) {
         if (CTime >= self.nextStateTime) {
            set_game_state (self.mcp, dmz.const.GameCountdown3)
            self.nextStateTime = CTime + 1
         }
      else if (State.contains (dmz.const.GameCountdown3)) {
         if (CTime >= self.nextStateTime) {
            set_game_state (self.mcp, dmz.const.GameCountdown2)
            self.nextStateTime = CTime + 1
         }
      else if (State.contains (dmz.const.GameCountdown2)) {
         if (CTime >= self.nextStateTime) {
            set_game_state (self.mcp, dmz.const.GameCountdown1)
            self.nextStateTime = CTime + 1
         }
      else if (State.contains (dmz.const.GameCountdown1)) {
         if (CTime >= self.nextStateTime) {
            set_game_state (self.mcp, dmz.const.GameActive)
            self.nextStateTime = CTime + 1
         }
      else
         self.log.error ("Game in unknown state. Changing to a waiting state")
         set_game_state (self.mcp, dmz.const.GameWaiting)
      }
   }
}

create_obj (obj, Type)
   if (Type.is_of_type (dmz.const.CycleType)) {
      self.cycleList[obj] = { drone = dmz.object.flag (obj, dmz.const.DroneHandle), }
      self.cycleCount = self.cycleCount + 1
      self.assignPoints = true
   }
}

destroy_obj (obj)
   var cycle = self.cycleList[obj]
   if (cycle) {
      self.cycleList[obj] = nil
      self.cycleCount = self.cycleCount - 1
      if (cycle.point) { self.playerCount = self.playerCount - 1 }
      self.assignPoints = true
   }
}

update_obj_state (obj, Attribute, State, PreviousState)
   var cycle = self.cycleList[obj]
   if (cycle) {
      if (!PreviousState) { PreviousState = dmz.const.EmptyState }
      if (State.contains (dmz.const.Dead) and
            !PreviousState.contains (dmz.const.Dead)) {
         cycle.dead = true
         cycle.standby = false
      else if (State.contains (dmz.const.Standby)
            && !PreviousState.contains (dmz.const.Standby)) {
         cycle.dead = false
         cycle.standby = true
      else
         cycle.dead = false
         cycle.standby = false
      }
   }
}

start ()
   self.handle = self.timeSlice.create (update_time_slice, self, self.name)
   var callbacks = {
      create_obj = create_obj,
      destroy_obj = destroy_obj,
      update_obj_state = update_obj_state,
   }
   self.objObs.register (nil, callbacks, self)

   self.mcp = dmz.object.create (dmz.const.MCPType)
   dmz.object.state (self.mcp, nil, dmz.const.GameWaiting)
   dmz.object.activate (self.mcp)
   dmz.object.set_temporary (self.mcp)
   create_start_points ()
}

stop ()
   if (self.handle && self.timeSlice) { self.timeSlice.destroy (self.handle) }
}

function new (config, name)
   var self = {
      start_plugin = start,
      stop_plugin = stop,
      log = dmz.log.new ("lua." + name),
      timeSlice = dmz.time_slice.new (),
      objObs = dmz.object_observer.new (),
      config = config,
      name = name,
      cycleList = {},
      cycleCount = 0,
      startPoints = {},
      waitTime = dmz.time.frame_time () + 1,
      maxCycles = config.to_number ("cycles.max", 6),
      minCycles = config.to_number ("cycles.min", 2),
   }

   self.log.info ("Creating plugin. " + name)

   if (config.to_boolean ("drone-free-play.value", false)) {
      is_all_drones = function () return false }
   }

   return self
}

