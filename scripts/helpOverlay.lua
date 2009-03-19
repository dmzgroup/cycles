require "const"

local Speed = 3

local function update_time_slice (self, time)
   if self.scaling then
      local scale = dmz.overlay.scale (self.transform)
      if self.show then
         scale = scale + (time * Speed)
         if scale >= 1 then
            scale = 1
            self.scaling = false
         end
      else
         scale = scale - (time * Speed)
         if scale <= 0.01 then
            scale = 0.01
            self.scaling = false
            dmz.overlay.enable_single_switch_state (self.switch, 0)
         end
      end
      dmz.overlay.scale (self.transform, scale)
   end
end

local HKey = dmz.input.get_key_value ("h")
local hKey = dmz.input.get_key_value ("H")
local SlashKey = dmz.input.get_key_value ("/")
local QuestionKey = dmz.input.get_key_value ("?")

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

   if event.key then
      if event.key.state then
         if HKey == event.key.value or hKey == event.key.value or
               SlashKey == event.key.value or QuestionKey == event.key.value then
            self.show = (not self.show)
            self.scaling = true
            if self.show then
               dmz.overlay.enable_single_switch_state (self.switch, 1)
            end
         end
      end
   end
end


local function start (self)
   self.handle = self.timeSlice:create (update_time_slice, self, self.name)

   self.inputObs:init_channels (
      self.config,
      dmz.input.Key + dmz.input.ChannelState,
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
      switch = dmz.overlay.lookup_handle ("help switch"),
      transform = dmz.overlay.lookup_handle ("help"),
      show = false,
      scaling = false,
   }

   dmz.overlay.scale (self.transform, 0.1)

   self.log:info ("Creating plugin: " .. name)
   
   return self
end

