require "const"

local function create_object (self, Object, Type)
   if Type:is_of_type (const.MCPType) then self.mcp = Object end
end

local function destroy_object (self, Object)

end

local function update_object_state (self, Object, Attribute, State, PreviousState)
   if Object == self.mcp then
      if not PreviousState then PreviousState = const.EmptyState end
      if State:contains (const.GameWaiting) and
            not PreviousState:contains (const.GameWaiting) then
         self.fade = false
         if self.audio then
            self.attr.gain = 1
            self.sound = dmz.audio.play (self.audio, self.init, self.attr)
         end
      elseif State:contains (const.GameCountdown5) and
            not PreviousState:contains (const.GameCountdown5) then
         self.fade = true
      end
   end
end

local function update_time_slice (self, DeltaTime)
   if self.fade and self.sound then
      self.attr.gain = self.attr.gain - (1.0 * DeltaTime)
      if self.attr.gain > 0 then
         dmz.audio.update (self.sound, self.attr) 
      else
         dmz.audio.stop (self.sound)
         self.sound = nil
         self.fade = false
      end
   end
end

local function start (self)
   local callbacks = {
      create_object = create_object,
      destroy_object = destroy_object,
      update_object_state = update_object_state,
   }
   self.objObs:register (nil, callbacks, self)
   self.tshandle = self.timeSlice:create (update_time_slice, self, self.name)
   self.audio = dmz.audio.create ("../../assets/sounds/scherzo.wav")
end

local function stop (self)
   if self.sound then dmz.audio.stop (self.sound) self.sound = nil end
   if self.audio then dmz.audio.destroy (self.audio) self.audio = nil end
end

function new (config, name)
   local self = {
      start_plugin = start,
      stop_plugin = stop,
      log = dmz.log.new ("lua." .. name),
      objObs = dmz.object_observer.new (),
      timeSlice = dmz.time_slice.new (),
      config = config,
      name = name,
      init = {relative = true, looped = true},
      attr = {gain = 1},
   }

   self.log:info ("Creating plugin: " .. name)
   
   return self
end

