, const = require("const")

var CountScale = 3.0
var GScale = 1.5
var SliderSpeed = 3.0

update_time_slice (time)

   var v1 = 10
   var v2 = 10
   var v3 = 10

   var hil = dmz.object.hil ()

   if (hil) {
      if (self.digitstate == 1) {
         if (self.active > 0) {

            var state = dmz.object.state (hil)

            if (state && state.contains (dmz.const.EngineOn)) {

               var vel = dmz.object.velocity (hil)

               if (!vel) { vel = dmz.vector.new () }

               var speed = vel.magnitude () * 3.6;

               v1 = Math.get_digit (speed, 0)
               v2 = Math.get_digit (speed, 1)
               v3 = Math.get_digit (speed, 2)
            }
         }
      else
         var count = 0
         if (self.digitstate == 2) {
            count = dmz.object.counter (hil, dmz.const.WinsHandle)
         else if (self.digitstate == 3) {
            count = dmz.object.counter (hil, dmz.const.KillsHandle)
         else if (self.digitstate == 4) {
            count = dmz.object.counter (hil, dmz.const.DeathsHandle)
         }

         if (!count) { count = 0 }

         v1 = Math.get_digit (count, 0)
         v2 = Math.get_digit (count, 1)
         v3 = Math.get_digit (count, 2)
      }
   }

   if (v3 == 0) {
      v3 = 10
      if (v2 == 0) { v2 = 10 }
   }

   dmz.overlay.enable_switch_state_single (self.digits[1], v1);
   dmz.overlay.enable_switch_state_single (self.digits[2], v2);
   dmz.overlay.enable_switch_state_single (self.digits[3], v3);

   if (self.currentCount) {
      var scale = dmz.overlay.scale (self.currentCount);
      if (scale) {
         scale = scale - (time * CountScale)
         if (scale < 0.01) { scale = 0.01 }
         dmz.overlay.scale (self.currentCount, scale)
      }
   }

   if (self.goactive) {
      var scale = dmz.overlay.scale (self.gameover)
      if (scale < GScale) {
         scale = scale + (GScale * time);
         if (scale > GScale) { scale = GScale }
         dmz.overlay.scale (self.gameover, scale)
         var rot = dmz.overlay.rotation (self.gameover)
         rot = rot - (Math.TwoPi * time * 3)
         if (rot < 0) { rot = Math.TwoPi + rot }
         dmz.overlay.rotation (self.gameover, rot)
      else
         dmz.overlay.scale (self.gameover, GScale)
         dmz.overlay.rotation (self.gameover, 0)
         dmz.overlay.enable_switch_state_single (self.gswitch, 2, true)
      }
   }

   if (self.slider) {
      //if (time > 0.1) { cprint (time) time = 0.1 }
      if (self.dashstate) {
         var x = dmz.overlay.position (self.slider)
         if (x > 0) { x = x - (400 * time * SliderSpeed) }
         if (x < 0) { x = 0 }
         dmz.overlay.position (self.slider, x, 0)
      else
         var x = dmz.overlay.position (self.slider)
         if (x < 300) { x = x + (400 * time * SliderSpeed) }
         if (x > 300) { x = 300 }
         dmz.overlay.position (self.slider, x, 0)
      }
   }
}

update_channel_state (channel, state)
   if (state) {  self.active = self.active + 1
   else {self.active = self.active - 1 }

   if (self.active == 1) {
      self.timeSlice.start (self.handle)
   else if (self.active == 0) {
      self.timeSlice.stop (self.handle)
   }
}

receive_button_event (channel, button)
   if (button.which == 2 && button.value) {
      self.dashstate = !self.dashstate
   else if (button.which == 3 && button.value) {
      self.digitstate = self.digitstate + 1
      if (self.digitstate > 4) { self.digitstate = 1 }
      if (self.digitstate == 1) {
         dmz.overlay.enable_switch_state_single (self.speedSwitch, 0) 
         dmz.overlay.enable_switch_state_single (self.winsSwitch, 1)
         dmz.overlay.enable_switch_state_single (self.killsSwitch, 1)
         dmz.overlay.enable_switch_state_single (self.deathsSwitch, 1)
      else if (self.digitstate == 2) {
         dmz.overlay.enable_switch_state_single (self.speedSwitch, 1) 
         dmz.overlay.enable_switch_state_single (self.winsSwitch, 0)
         dmz.overlay.enable_switch_state_single (self.killsSwitch, 1)
         dmz.overlay.enable_switch_state_single (self.deathsSwitch, 1)
      else if (self.digitstate == 3) {
         dmz.overlay.enable_switch_state_single (self.speedSwitch, 1) 
         dmz.overlay.enable_switch_state_single (self.winsSwitch, 1)
         dmz.overlay.enable_switch_state_single (self.killsSwitch, 0)
         dmz.overlay.enable_switch_state_single (self.deathsSwitch, 1)
      else if (self.digitstate == 4) {
         dmz.overlay.enable_switch_state_single (self.speedSwitch, 1) 
         dmz.overlay.enable_switch_state_single (self.winsSwitch, 1)
         dmz.overlay.enable_switch_state_single (self.killsSwitch, 1)
         dmz.overlay.enable_switch_state_single (self.deathsSwitch, 0)
      }
   }
}

create_obj (obj, Type)
   if (Type.is_of_type (dmz.const.MCPType)) { self.mcp = obj }
}

destroy_obj (obj)

}

update_obj_state (obj, Attribute, State, PreviousState)
   if (obj == self.mcp) {
      if (!PreviousState) { PreviousState = dmz.mask.new () }
      if (State.contains (dmz.const.GameCountdown5)
            && !PreviousState.contains (dmz.const.GameCountdown5)) {
         dmz.overlay.enable_switch_state_single (self.switch, 5)
         self.currentCount = self.countdown[5]
         dmz.overlay.scale (self.currentCount, CountScale)
         dmz.overlay.switch_state_all (self.waiting, false)
         dmz.overlay.switch_state_all (self.gswitch, false)
         self.goactive = false;
      else if (State.contains (dmz.const.GameCountdown4)
            && !PreviousState.contains (dmz.const.GameCountdown4)) {
         dmz.overlay.enable_switch_state_single (self.switch, 4)
         self.currentCount = self.countdown[4]
         dmz.overlay.scale (self.currentCount, CountScale)
      else if (State.contains (dmz.const.GameCountdown3)
            && !PreviousState.contains (dmz.const.GameCountdown3)) {
         dmz.overlay.enable_switch_state_single (self.switch, 3)
         self.currentCount = self.countdown[3]
         dmz.overlay.scale (self.currentCount, CountScale)
      else if (State.contains (dmz.const.GameCountdown2)
            && !PreviousState.contains (dmz.const.GameCountdown1)) {
         dmz.overlay.enable_switch_state_single (self.switch, 2)
         self.currentCount = self.countdown[2]
         dmz.overlay.scale (self.currentCount, CountScale)
      else if (State.contains (dmz.const.GameCountdown1)
            && !PreviousState.contains (dmz.const.GameCountdown1)) {
         dmz.overlay.enable_switch_state_single (self.switch, 1)
         self.currentCount = self.countdown[1]
         dmz.overlay.scale (self.currentCount, CountScale)
      else if (State.contains (dmz.const.GameActive)
            && !PreviousState.contains (dmz.const.GameActive)) {
         dmz.overlay.switch_state_all (self.switch, false)
         self.currentCount = nil
      }

      if (State.contains (dmz.const.GameWaiting)
            && PreviousState.contains (dmz.const.GameActive)) {
         dmz.overlay.scale (self.gameover, 0.01)
         dmz.overlay.enable_switch_state_single (self.gswitch, 1, true)
         self.goactive = true;
      }
   }
}

start ()
   self.handle = self.timeSlice.create (update_time_slice, self, self.name)

   self.inputObs.register (
      self.config,
      {
         update_channel_state = update_channel_state,
         receive_button_event = receive_button_event,
      },
      self);

   if (self.handle && self.active == 0) { self.timeSlice.stop (self.handle) }

   var callbacks = {
      create_obj = create_obj,
      destroy_obj = destroy_obj,
      update_obj_state = update_obj_state,
   }
   self.objObs.register (nil, callbacks, self)
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
      objObs = dmz.object_observer.new (),
      active = 0,
      config = config,
      digits = {
         dmz.overlay.lookup_clone_sub_handle ("digit1", "switch"),
         dmz.overlay.lookup_clone_sub_handle ("digit2", "switch"),
         dmz.overlay.lookup_clone_sub_handle ("digit3", "switch"),
      },
      switch = dmz.overlay.lookup_handle ("countdown switch"),
      countdown = {
         dmz.overlay.lookup_handle ("one"),
         dmz.overlay.lookup_handle ("two"),
         dmz.overlay.lookup_handle ("three"),
         dmz.overlay.lookup_handle ("four"),
         dmz.overlay.lookup_handle ("five"),
      },
      slider = dmz.overlay.lookup_handle ("dashboard slider"),
      dashstate = true,
      digitstate = 1,
      waiting = dmz.overlay.lookup_handle ("waiting switch"),
      gameover = dmz.overlay.lookup_handle ("gameover transform"),
      gswitch = dmz.overlay.lookup_handle ("gameover switch"),
      speedSwitch = dmz.overlay.lookup_handle ("speed switch"),
      winsSwitch = dmz.overlay.lookup_handle ("wins switch"),
      killsSwitch = dmz.overlay.lookup_handle ("kills switch"),
      deathsSwitch = dmz.overlay.lookup_handle ("deaths switch"),
   }

   self.log.info ("Creating plugin. " + name)
   
   return self
}

