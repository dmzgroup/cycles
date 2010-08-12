, const = require("const")

var Speed = 3

update_time_slice (time)
   if (self.scaling) {
      var scale = dmz.overlay.scale (self.transform)
      if (self.show) {
         scale = scale + (time * Speed)
         if (scale >= 1) {
            scale = 1
            self.scaling = false
         }
      else
         scale = scale - (time * Speed)
         if (scale <= 0.01) {
            scale = 0.01
            self.scaling = false
            dmz.overlay.enable_switch_state_single (self.switch, 0)
         }
      }
      dmz.overlay.scale (self.transform, scale)
   }
}

var HKey = dmz.input.get_key_value ("h")
var hKey = dmz.input.get_key_value ("H")
var SlashKey = dmz.input.get_key_value ("/")
var QuestionKey = dmz.input.get_key_value ("?")


update_channel_state (channel, state)
   if (state) {  self.active = self.active + 1
   else {self.active = self.active - 1 }

   if (self.active == 1) {
      self.timeSlice.start (self.handle)
   else if (self.active == 0) {
      self.timeSlice.stop (self.handle)
   }
}

receive_key_event (channel, key)
   if (key.state) {
      if (HKey == key.value || hKey == key.value or
            SlashKey == key.value || QuestionKey == key.value) {
         self.show = (!self.show)
         self.scaling = true
         if (self.show) {
            dmz.overlay.enable_switch_state_single (self.switch, 1)
         }
      }
   }
}


start ()
   self.handle = self.timeSlice.create (update_time_slice, self, self.name)

   self.inputObs.register (
      self.config,
      {
         update_channel_state = update_channel_state,
         receive_key_event = receive_key_event,
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
      switch = dmz.overlay.lookup_handle ("help switch"),
      transform = dmz.overlay.lookup_handle ("help"),
      show = false,
      scaling = false,
   }

   dmz.overlay.scale (self.transform, 0.1)

   self.log.info ("Creating plugin. " + name)
   
   return self
}

