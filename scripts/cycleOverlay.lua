require "const"

local function update_time_slice (self, time)

   local hil = dmz.object.hil ()

   if hil and self.active > 0 then

      local state = dmz.object.state (hil)

      if state and state:contains (const.EngineOn) then

         local vel = dmz.object.velocity (hil)

         if not vel then vel = dmz.vector.new () end

         local speed = vel:magnitude () * 3.6;


         local v1 = dmz.math.get_digit (speed, 0)
         local v2 = dmz.math.get_digit (speed, 1)
         local v3 = dmz.math.get_digit (speed, 2)

         if v3 == 0 then
            v3 = 10
            if v2 == 0 then v2 = 10 end
         end

         dmz.overlay.enable_single_switch_state (self.digits[1], v1);
         dmz.overlay.enable_single_switch_state (self.digits[2], v2);
         dmz.overlay.enable_single_switch_state (self.digits[3], v3);
      else
         dmz.overlay.enable_single_switch_state (self.digits[1], 10);
         dmz.overlay.enable_single_switch_state (self.digits[2], 10);
         dmz.overlay.enable_single_switch_state (self.digits[3], 10);
      end
   end
end

local function receive_input_event (self, event)

   if event.state then 
      if event.state.active then  self.active = self.active + 1
      else self.active = self.active - 1 end

      if self.active == 1 then
         self.timeSlice:start (self.handle)
      elseif self.active == 0 then
         self.timeSlice:stop (self.handle)
      end
   end

   if event.button then
      --print ("button: " .. event.button.which .. " value: " .. tostring (event.button.value))
   end
end


local function start (self)
   self.handle = self.timeSlice:create (update_time_slice, self, self.name)

   self.inputObs:init_channels (
      self.config,
      dmz.input.Button + dmz.input.ChannelState,
      receive_input_event,
      self);

   if self.handle and self.active == 0 then self.timeSlice:stop (self.handle) end
end


local function stop (self)
   if self.handle and self.timeSlice then self.timeSlice:destroy (self.handle) end
   self.inputObs:release_all ()
end


function new (config, name)
   local self = {
      start_plugin = start,
      stop_plugin = stop,
      name = name,
      log = dmz.log.new ("lua." .. name),
      timeSlice = dmz.time_slice.new (),
      inputObs = dmz.input_observer.new (),
      active = 0,
      config = config,
      digits = {
         dmz.overlay.lookup_clone_sub_handle ("digit1", "switch"),
         dmz.overlay.lookup_clone_sub_handle ("digit2", "switch"),
         dmz.overlay.lookup_clone_sub_handle ("digit3", "switch"),
      },
   }

   self.log:info ("Creating plugin: " .. name)
   
   return self
end

