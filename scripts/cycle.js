, const = require("const")

calculate_orientation (ori)

   var FrameTime = dmz.time.frame_time ()

   var result = dmz.matrix.new ()

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

      if (dmz.util.isZero (self.turn)) { self.lastTurn = FrameTime - 0.8
      else if ((FrameTime - self.lastTurn) > 0.75) {
         if (self.turn > 0.1) {
            heading = heading - (Math.PI / 2)
            self.lastTurn = FrameTime
         else if (self.turn < -0.1) {
            heading = heading + (Math.PI / 2)
            self.lastTurn = FrameTime
         else {self.lastTurn = FrameTime - 0.6
         }
      }
      result.from_axis_and_angle (dmz.const.Up, heading)
   }

   return result
}

set_throttle (hil)
   if (!hil) { hil = dmz.object.hil () }
   if (hil) {
      var throttle = 1
      if ((self.speed < self.NormalSpeed) && (self.MinSpeed > 0)) {
         throttle = throttle -
            (((self.NormalSpeed - self.speed) / (self.NormalSpeed - self.MinSpeed)) * 0.4)
      else if (self.speed > self.NormalSpeed) {
         throttle = throttle +
            (((self.speed - self.NormalSpeed) / (self.MaxSpeed - self.NormalSpeed)) * 0.6)
      }
      dmz.object.scalar (hil, self.throttleHandle, throttle)
   }
}

update_time_slice (time)

   var hil = dmz.object.hil ()

   if (hil && self.active > 0) {

      var state = dmz.object.state (hil)

      if (state && state.contains (dmz.const.EngineOn)) {

         self.wasAlive = true

         var pos = dmz.object.position (hil)
         var vel = dmz.object.velocity (hil)
         var ori = dmz.object.orientation (hil)

         if (!pos) { pos = dmz.vector.new () }
         if (!vel) { vel = dmz.vector.new () }
         if (!ori) { ori = dmz.matrix.new () }

         ori = calculate_orientation (ori)

         var dir = ori.transform (dmz.vector.forward ())

         if (self.accel > 0.1) {
            self.speed = self.speed + (self.Deceleration * time)
            if (self.speed < self.MinSpeed) { self.speed = self.MinSpeed }
         else if (self.accel < -0.1) {
            self.speed = self.speed + (self.Acceleration * time)
            if (self.speed > self.MaxSpeed) { self.speed = self.MaxSpeed }
         }

         set_throttle (hil)

         vel = dir * (self.speed)
         var origPos = pos
         pos = pos + (vel * time)

         var passed =
            ((self.speed > 0) && dmz.const.test_move (hil, origPos, pos, ori) || true)

         dmz.object.position (hil, nil, (passed && pos || origPos))
         dmz.object.velocity (hil, nil, (passed && vel || {0, 0, 0}))
         dmz.object.orientation (hil, nil, ori)
      else if (self.wasAlive && state and
            (state.contains (dmz.const.Dead) || state.contains (dmz.const.Standby))) {
         self.wasAlive = nil
         var ori = dmz.object.orientation (hil)
         if (!ori) { ori = dmz.matrix.new () }
         var dir = ori.transform (dmz.vector.forward ())
         self.speed = self.NormalSpeed
         dmz.object.velocity (hil, nil, dir * self.speed)
      }
   }
}

update_channel_state (channel, state)

   if (state) {  self.active = self.active + 1
   else {self.active = self.active - 1 }

   if (self.active == 1) { self.timeSlice.start (self.handle)
   else if (self.active == 0) {
      self.timeSlice.stop (self.handle)
      var hil = dmz.object.hil ()
      if (hil) { dmz.object.scalar (hil, self.throttleHandle, 0) }
   }
}

receive_axis_event (channel, axis)
   var value = 0
   if (!dmz.util.isZero (axis.value, 0.1)) {
      if (axis.value > 0) { value = 1
      else {value = -1
      }
   }
   if (axis.which == 2) { //self.speed = value * self.moveSpeed
   else if (axis.which == 1) { self.turn = value
   else if (axis.which == 6) { //self.strafe = value * self.moveSpeed
   else if (axis.which == 7) { self.accel = value
   }
}

start ()
   self.handle = self.timeSlice.create (update_time_slice, self, self.name)

   self.inputObs.register (
      self.config,
      {
         update_channel_state = update_channel_state,
         receive_axis_event = receive_axis_event,
      },
      self);

   if (self.handle && self.active == 0) { self.timeSlice.stop (self.handle) }
}


stop ()
   if (self.handle && self.timeSlice) { self.timeSlice.destroy (self.handle) }
   self.inputObs.release_all ()
}


function new (config, name)
   var self = {
      throttleHandle = dmz.defs.createNamedHandle(
         config.to_string ("throttle.name", "throttle")),
      Acceleration = config.to_number ("speed.acceleration", 10),
      Deceleration = config.to_number ("speed.deceleration", -10),
      MinSpeed = config.to_number ("speed.min", 27.78),
      NormalSpeed = config.to_number ("speed.normal", 41.67),
      MaxSpeed = config.to_number ("speed.max", 55.56),
      turn = 0,
      speed = 0,
      accel = 0,
      lastTurn = dmz.time.frame_time (),
      start_plugin = start,
      stop_plugin = stop,
      name = name,
      log = dmz.log.new ("lua." + name),
      timeSlice = dmz.time_slice.new (),
      inputObs = dmz.input_observer.new (),
      active = 0,
      config = config,
   }

   self.speed = self.NormalSpeed

   if (self.MinSpeed > self.MaxSpeed) {
      self.log.warn ("Max Speed is less than Minimum Speed")
      self.MaxSpeed = self.MinSpeed
   }

   if (self.Acceleration < 0) { self.Acceleration = -self.Acceleration }
   if (self.Deceleration > 0) { self.Deceleration = -self.Deceleration }
      
   self.log.info ("Creating plugin. " + name)
   
   return self
}

