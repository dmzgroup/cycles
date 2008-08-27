local GameWaiting = dmz.definitions.lookup_state ("Game_Waiting")
local GameCountdown5 = dmz.definitions.lookup_state ("Game_Countdown_5")
local GameCountdown4 = dmz.definitions.lookup_state ("Game_Countdown_4")
local GameCountdown3 = dmz.definitions.lookup_state ("Game_Countdown_3")
local GameCountdown2 = dmz.definitions.lookup_state ("Game_Countdown_2")
local GameCountdown1 = dmz.definitions.lookup_state ("Game_Countdown_1")
local GameActive = dmz.definitions.lookup_state ("Game_Active")
local TimeStampHandle = dmz.handle.new ("MCP_Running_Time")
local StartLinkHandle = dmz.handle.new ("Start_Position")
local MCPType = dmz.object_type.new ("mcp")
local StartPointType = dmz.object_type.new ("start_point")

local function update_time_slice (self, time)

end

local function start (self)
   self.handle = self.timeSlice:create (update_time_slice, self, self.name)
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
      log = dmz.log.new ("lua." .. name),
      timeSlice = dmz.time_slice.new (),
      objObs = dmz.obj_observer.new (),
      active = 0,
      config = config,
      name = name,
   }

   self.log:info ("Creating plugin: " .. name)
   
   return self
end

