local GameWaiting = dmz.definitions.lookup_state ("Game_Waiting")
local GameCountdown5 = dmz.definitions.lookup_state ("Game_Countdown_5")
local GameCountdown4 = dmz.definitions.lookup_state ("Game_Countdown_4")
local GameCountdown3 = dmz.definitions.lookup_state ("Game_Countdown_3")
local GameCountdown2 = dmz.definitions.lookup_state ("Game_Countdown_2")
local GameCountdown1 = dmz.definitions.lookup_state ("Game_Countdown_1")
local GameActive = dmz.definitions.lookup_state ("Game_Active")
local TimeStampHandle = dmz.handle.new ("MCP_Running_Time")
local StartLinkHandle = dmz.handle.new ("Start_Position")
local CycleType = dmz.object_type.new ("cycle")
local MCPType = dmz.object_type.new ("mcp")
local StartPointType = dmz.object_type.new ("start_point")
local WaitPointType = dmz.object_type.new ("wait_point")

local function update_time_slice (self, time)

end

local function create_object (self, Object, Type)
   if Type:is_of_type (CycleType) then
      local startPoint = { handle = dmz.object.create (StartPointType), }
      dmz.object.position (startPoint.handle, nil, {500, 0, 500})
      dmz.object.link (StartLinkHandle, startPoint.handle, Object)
      dmz.object.activate (startPoint.handle)
      dmz.object.set_temporary (startPoint.handle)
      self.cycleList[Object] = startPoint
   end
end

local function destroy_object (self, Object)
   local startPoint = self.cycleList[Object]
   if startPoint then
      self.cycleList[Object] = nil
      dmz.object.destroy (startPoint.handle)
   end
end

local function update_object_state (self, Object, Attribute, State, PrevousState)

end

local function start (self)
   self.handle = self.timeSlice:create (update_time_slice, self, self.name)
   local callbacks = {
      create_object = create_object,
      destroy_object = destroy_object,
      update_object_state = update_object_state,
   }
   self.objObs:register (nil, callbacks, self)
   self.mcp = dmz.object.create (MCPType)
   dmz.object.state (self.mcp, nil, GameActive)
   dmz.object.activate (self.mcp)
   dmz.object.set_temporary (self.mcp)
end

local function stop (self)
   if self.handle and self.timeSlice then self.timeSlice:destroy (self.handle) end
end

function new (config, name)
   local self = {
      start_plugin = start,
      stop_plugin = stop,
      log = dmz.log.new ("lua." .. name),
      timeSlice = dmz.time_slice.new (),
      objObs = dmz.object_observer.new (),
      config = config,
      name = name,
      cycleList = {},
   }

   self.log:info ("Creating plugin: " .. name)
   
   return self
end

