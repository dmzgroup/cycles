, const = require("const")

update_time_slice (time)

   var hil = dmz.object.hil ()

   if (hil && self.active > 0) {

      var state = dmz.object.state (hil)

      if (state && state.contains (dmz.const.Dead)) {
         if (self.watch) {
            var pos = dmz.vector.new (300, 50, 300)
            var ori = dmz.matrix.new (dmz.const.Forward, dmz.vector.new ({-1, 0, -1}))
            dmz.portal.set_view (pos, ori)
         }
      else
         self.watch = false
         var MaxTurn = (Math.TwoPi * time)
         var pos = dmz.object.position (hil)
         var ori = dmz.object.orientation (hil)
         var dir = dmz.object.velocity (hil)

         if (!pos) { pos = dmz.vector.new () }
         if (!ori) { ori = dmz.matrix.new () }
         if (!dir || dir.is_zero ()) { dir = ori.transform (dmz.const.Forward)
         else {dir = dir.normalize ()
         }
         var heading = self.heading
         var prevOri = dmz.matrix.new (dmz.const.Up, self.heading)
         var prevDir = prevOri.transform (dmz.const.Forward)
         var headingDiff = prevDir.get_angle (dir)
         if (headingDiff > MaxTurn) { headingDiff = MaxTurn }
         if (prevDir.cross (dir).get_y () < 0) { heading = heading - headingDiff
         else {heading = heading + headingDiff
         }
         self.heading = heading
         if (self.backMod) { heading = heading + self.backMod
         else if (self.sideMod) { heading = heading + self.sideMod
         }

         ori = dmz.matrix.new (dmz.const.Up, heading)
         pos = ori.transform (self.offset) + pos
         dmz.portal.set_view (pos, ori)
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
   if (axis.which == 2) {
      if (value > 0) { self.backMod = Math.Pi
      else {self.backMod = nil
      }
   else if (axis.which == 1) {
   else if (axis.which == 6) {  
      if (value > 0) { self.sideMod = (Math.PI / 2)
      else if (value < 0) { self.sideMod = -(Math.PI / 2)
      else {self.sideMod = nil
      }
   else if (axis.which == 7) { 
   }
}

receive_button_event (channel, button)
   if (button.which == 1 && button.value) { self.watch = true 
   }
}

start ()
   self.handle = self.timeSlice.create (update_time_slice, self, self.name)

   self.inputObs.register (
      self.config,
      {
         update_channel_state = update_channel_state,
         receive_axis_event = receive_axis_event,
         receive_button_event = receive_button_event,
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
      start_plugin = start,
      stop_plugin = stop,
      name = name,
      log = dmz.log.new ("lua." + name),
      timeSlice = dmz.time_slice.new (),
      inputObs = dmz.input_observer.new (),
      active = 0,
      config = config,
      offset = config.to_vector ("offset", {0.0, 3.0, 8.0}),
      heading = 0,
   }

   self.log.info ("Creating plugin. " + name)
   
   return self
}

