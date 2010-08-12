, const = require("const")

next_turn (FrameTime)
   return FrameTime + (math.random () * 4) + 0.5
}

random_speed ()
   return self.NormalSpeed + (-5 + (10 * math.random ()))
}

test_distance (obj, pos, heading)
   var result = 0
   pos = dmz.vector.new (pos.get_x (), pos.get_y () + 0.2, pos.get_z ())
   var ori = dmz.matrix.new (dmz.const.Up, heading)
   var dir = dmz.vector.new (dmz.const.Forward)
   dir = ori.transform (dir)

   dmz.isect.disable_isect (obj)
   var isectResults = dmz.isect.do_isect (
      { type = dmz.isect.RayTest, start = pos, vector = dir, },
      { type = dmz.isect.ClosestPoint, })
   if (isectResults && isectResults[1]) { result = isectResults[1].distance }
   dmz.isect.enable_isect (obj)
   return result
}

calculate_orientation (obj, info, pos, ori)

   var FrameTime = dmz.time.frame_time ()

   var result = dmz.matrix.new (ori)

   if (!info.lastTurnTime) {
      info.lastTurnTime = FrameTime
      info.nextTurnTime = next_turn (FrameTime)
   else if ((FrameTime - info.lastTurnTime) > 0.2) {

      var forceTurn = false
      if (info.nextTurnTime <  FrameTime) {
         forceTurn = true
      }
      var dir = ori.transform (dmz.const.Forward)
      dir.set_y (0)

      if (!dir.is_zero ()) {
         dir = dir.normalize ()
         var heading = dmz.const.Forward.get_angle (dir)
         var cross =  dmz.const.Forward.cross (dir)
         if (cross.get_y () < 0) { heading = Math.TwoPi - heading }
         var remainder = math.fmod (heading, (Math.PI / 2))
         if (remainder > ((Math.PI / 2) / 2)) {
            heading = heading + (Math.PI / 2) - remainder
         else
            heading = heading - remainder
         }

         var forward = test_distance (obj, pos, heading)
         if (forceTurn || (forward < 2)) {
            info.lastTurnTime = FrameTime
            info.nextTurnTime = next_turn (FrameTime)
            var right = test_distance (obj, pos, heading - (Math.PI / 2))
            var left = test_distance (obj, pos, heading + (Math.PI / 2))
            if (right > left) {
               if (right > forward) { heading = heading - (Math.PI / 2) }
            else if (left > forward) { heading = heading + (Math.PI / 2)
            }
         }
         result.from_axis_and_angle (dmz.const.Up, heading)
      }
   }

   return result
}

set_throttle (obj, info)
   if (obj) {
      var throttle = 1
      if ((info.speed < self.NormalSpeed) && (self.MinSpeed > 0)) {
         throttle = throttle -
            (((self.NormalSpeed - info.speed) / (self.NormalSpeed - self.MinSpeed)) * 0.4)
      else if (info.speed > self.NormalSpeed) {
         throttle = throttle +
            (((info.speed - self.NormalSpeed) / (self.MaxSpeed - self.NormalSpeed)) * 0.6)
      }
      dmz.object.scalar (obj, self.throttleHandle, throttle)
   }
}

update_time_slice (time)

   for (obj, info in pairs (self.objs)) {

      var state = dmz.object.state (obj)

      if (state && state.contains (dmz.const.EngineOn)) {

         var pos = dmz.object.position (obj)
         var vel = dmz.object.velocity (obj)
         var ori = dmz.object.orientation (obj)

         if (!pos) { pos = dmz.vector.new () }
         if (!vel) { vel = dmz.vector.new () }
         if (!ori) { ori = dmz.matrix.new () }

         ori = calculate_orientation (obj, info, pos, ori)

         var dir = ori.transform (dmz.vector.forward ())

         set_throttle (obj, info)

         vel = dir * (info.speed)
         var origPos = pos
         pos = pos + (vel * time)

         var passed =
            ((info.speed > 0) && dmz.const.test_move (obj, origPos, pos, ori)
               || true)

         dmz.object.position (obj, nil, (passed && pos || origPos))
         dmz.object.velocity (obj, nil, (passed && vel || {0, 0, 0}))
         dmz.object.orientation (obj, nil, ori)
      else
         dmz.object.velocity (obj, nil, {0, 0, 0})
      }
   }
}

create_obj (obj, Type)
   if (Type.is_of_type (dmz.const.MCPType)) { self.mcp = obj }
}

destroy_obj (obj)

}

update_obj_state (obj, Attribute, State, PreviousState)
   if (!PreviousState) { PreviousState = dmz.const.EmptyState }
   var info = self.objs[obj]
   if (info) {
      if (State.contains (dmz.const.Standby) and
            !PreviousState.contains (dmz.const.Standby)) {
         if (info.pos && info.ori) {
            dmz.object.position (obj, nil, info.pos)
            dmz.object.orientation (obj, nil, info.ori)
            dmz.object.velocity (obj, nil, {0, 0, 0})
            info.speed = random_speed ()
         }
      }
   else if (obj == self.mcp) {
      var newState = nil
      if (State.contains (dmz.const.GameWaiting) and
            !PreviousState.contains (dmz.const.GameWaiting)) {
         newState = dmz.const.Standby
      else if (State.contains (dmz.const.GameActive) and
            !PreviousState.contains (dmz.const.GameActive)) {
         newState = dmz.const.EngineOn
      }
      if (newState) {
         var FrameTime = dmz.time.frame_time ()
         for (obj, info in pairs (self.objs)) {
            info.lastTurnTime = FrameTime
            info.nextTurnTime = next_turn (FrameTime)
            if (info.startobj) {
               var cycleState = dmz.object.state (obj)
               if (!cycleState) { cycleState = dmz.mask.new () }
               cycleState.unset (dmz.const.CycleState)
               cycleState = cycleState + newState
               dmz.object.state (obj, nil, cycleState)
            }
         }
      }
   }
}

link_objs (Link, Attribute, Super, Sub)
   var SuperType = dmz.object.type (Super)
   var info = self.objs[Sub]
   if (SuperType && info) {
      if (SuperType.is_of_type (dmz.const.StartPointType)) {
         info.startobj = Super
         info.pos = dmz.object.position (Super)
         info.ori = dmz.object.orientation (Super)
         var cycleState = dmz.object.state (Sub)
         if (!cycleState) { cycleState = dmz.mask.new () }
         cycleState.unset (dmz.const.CycleState)
         cycleState = cycleState + dmz.const.Standby
         dmz.object.state (Sub, nil, cycleState)
      else
         
      }
   }
}

unlink_objs (Link, Attribute, Super, Sub)
   var info = self.objs[Sub]
   if (info && info.startobj == Super) {
      var cycleState = dmz.object.state (Sub)
      if (!cycleState) { cycleState = dmz.mask.new () }
      cycleState.unset (dmz.const.CycleState)
      cycleState = cycleState + dmz.const.Dead
      dmz.object.state (Sub, nil, cycleState)
      info.startobj = nil
      info.pos = nil
      info.ori = nil
   }
}

start ()

   self.handle = self.timeSlice.create (update_time_slice, self, self.name)

   for (ix = 1, self.droneCount) {
      var obj = dmz.object.create (
         dmz.const.CycleTypeList[math.random (1, #(dmz.const.CycleTypeList))])
      if (obj) {
         self.objs[obj] = { speed = random_speed (), }
         dmz.object.state (obj, nil, dmz.const.Dead)
         dmz.object.position (obj, nil, {0, 0, 0})
         dmz.object.flag (obj, dmz.const.DroneHandle, true)
         dmz.object.activate (obj)
         dmz.object.set_temporary (obj)
      }
   }

   var callbacks = {
      create_obj = create_obj,
      destroy_obj = destroy_obj,
      update_obj_state = update_obj_state,
   }

   self.objObs.register (nil, callbacks, self)

   callbacks = {
      link_objs = link_objs,
      unlink_objs = unlink_objs,
    }

   self.objObs.register (dmz.const.StartLinkHandle, callbacks, self)
}

stop ()
   if (self.handle && self.timeSlice) { self.timeSlice.destroy (self.handle) }
}


function new (config, name)
   var self = {
      throttleHandle = dmz.defs.createNamedHandle(
         config.to_string ("throttle.name", "throttle")),
      Acceleration = config.to_number ("speed.acceleration", 10),
      Deceleration = config.to_number ("speed.deceleration", -10),
      MinSpeed = config.to_number ("speed.min", 25),
      NormalSpeed = config.to_number ("speed.normal", 45),
      MaxSpeed = config.to_number ("speed.max", 55),
      start_plugin = start,
      stop_plugin = stop,
      name = name,
      log = dmz.log.new ("lua." + name),
      objObs = dmz.object_observer.new (),
      timeSlice = dmz.time_slice.new (),
      config = config,
      droneCount = config.to_number ("count.value", 1),
      objs = {},
   }

   if (self.MinSpeed > self.MaxSpeed) {
      self.log.warn ("Max Speed is less than Minimum Speed")
      self.MaxSpeed = self.MinSpeed
   }

   if (self.Acceleration < 0) { self.Acceleration = -self.Acceleration }
   if (self.Deceleration > 0) { self.Deceleration = -self.Deceleration }
      
   self.log.info ("Creating plugin. " + name)
   
   return self
}

