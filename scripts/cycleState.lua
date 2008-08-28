local GameWaiting = dmz.definitions.lookup_state ("Game_Waiting")
local GameActive = dmz.definitions.lookup_state ("Game_Active")
local Dead = dmz.definitions.lookup_state ("Dead")
local Standby = dmz.definitions.lookup_state ("Standby")
local EngineOn = dmz.definitions.lookup_state ("Engine_On")
local EmptyState = dmz.mask.new ()
local TimeStampHandle = dmz.handle.new ("MCP_Running_Time")
local StartLinkHandle = dmz.handle.new ("Start_Position")
local CycleType = dmz.object_type.new ("cycle")
local MCPType = dmz.object_type.new ("mcp")
local StartPointType = dmz.object_type.new ("start_point")
local WaitPointType = dmz.object_type.new ("wait_point")

local function create_object (self, Object, Type)
   if Type:is_of_type (MCPType) then self.mcp = Object end
end

local function destroy_object (self, Object)

end

local function update_object_state (self, Object, Attribute, State, PreviousState)
   if Object == self.mcp and self.active then
      local hil = dmz.object.hil ()
      if not PreviousState then PreviousState = EmptyState end
      if State:contains (GameWaiting) and not PreviousState:contains (GameWaiting) then
         local cycleState = dmz.object.state (hil)
         if cycleState then
            cycleState:unset (Dead + EngineOn)
            cycleState = cycleState + Standby
         else cycleState = Standby
         end
         dmz.object.state (hil, nil, cycleState)
         if self.startPos then dmz.object.position (hil, nil, self.startPos) end
         if self.startOri then dmz.object.orientation (hil, nil, self.startOri) end
      elseif State:contains (GameActive) and not PreviousState:contains (GameActive) then
         local cycleState = dmz.object.state (hil, nil)
         if cycleState then
            cycleState:unset (Dead + Standby)
            cycleState = cycleState + EngineOn
         else cycleState = EngineOn
         end
         dmz.object.state (hil, nil, cycleState)        
      end
   end
end

local function link_objects (self, Link, Attribute, Super, Sub)
   local SuperType = dmz.object.type (Super)
   local hil = dmz.object.hil ()
   if SuperType and Sub == hil then
      if SuperType:is_of_type (StartPointType) then
         self.active = true
         self.startPos = dmz.object.position (Super)
         self.startOri = dmz.object.orientation (Super)
         if self.mcp then
            local mcpState = dmz.object.state (self.mcp)
            if mcpState then update_object_state (self, self.mcp, nil, mcpState) end
         end
      elseif SuperType:is_of_type (WaitPointType) then
         self.active = false
         local cycleState = dmz.object.state (hil)
         if cycleState then
            cycleState.unset (Dead + Engine_On)
            cycleState = cycleState + Standby
            dmz.object.state (hil , nil, cycleState)
            local pos = dmz.object.position (Super)
            if pos then dmz.object.position (hil, nil, pos) end
         end
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
   callbacks = { link_objects = link_objects, }
   self.objObs:register (StartLinkHandle, callbacks, self)
end

local function stop (self)
end

function new (config, name)
   local self = {
      start_plugin = start,
      stop_plugin = stop,
      log = dmz.log.new ("lua." .. name),
      objObs = dmz.object_observer.new (),
      config = config,
      name = name,
   }

   self.log:info ("Creating plugin: " .. name)
   
   return self
end

