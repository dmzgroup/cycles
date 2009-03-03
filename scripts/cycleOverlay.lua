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

local function create_object (self, Object, Type)
   if Type:is_of_type (const.MCPType) then self.mcp = Object end
end

local function destroy_object (self, Object)

end

local function update_object_state (self, Object, Attribute, State, PreviousState)
   if Object == self.mcp then
      if not PreviousState then PreviousState = dmz.mask.new () end
      if State:contains (const.GameCountdown5)
            and not PreviousState:contains (const.GameCountdown5) then
         dmz.overlay.enable_single_switch_state (self.switch, 5)
      elseif State:contains (const.GameCountdown4)
            and not PreviousState:contains (const.GameCountdown4) then
         dmz.overlay.enable_single_switch_state (self.switch, 4)
      elseif State:contains (const.GameCountdown3)
            and not PreviousState:contains (const.GameCountdown3) then
         dmz.overlay.enable_single_switch_state (self.switch, 3)
      elseif State:contains (const.GameCountdown2)
            and not PreviousState:contains (const.GameCountdown1) then
         dmz.overlay.enable_single_switch_state (self.switch, 2)
      elseif State:contains (const.GameCountdown1)
            and not PreviousState:contains (const.GameCountdown1) then
         dmz.overlay.enable_single_switch_state (self.switch, 1)
      elseif State:contains (const.GameActive)
            and not PreviousState:contains (const.GameActive) then
         dmz.overlay.all_switch_state (self.switch, false)
      end
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

   local callbacks = {
      create_object = create_object,
      destroy_object = destroy_object,
      update_object_state = update_object_state,
   }
   self.objObs:register (nil, callbacks, self)
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
   }

   self.log:info ("Creating plugin: " .. name)
   
   return self
end

