require "const"

local function create_object (self, Object, Type)
   if Type:is_of_type (const.MCPType) then self.mcp = Object end
end

local function destroy_object (self, Object)

end

local function update_object_state (self, Object, Attribute, State, PreviousState)
   local hil = dmz.object.hil ()
   if hil and Object == self.mcp and self.active then
      if not PreviousState then PreviousState = const.EmptyState end
      if State:contains (const.GameWaiting) and
            not PreviousState:contains (const.GameWaiting) then
         local cycleState = dmz.object.state (hil)
         if cycleState then
            cycleState:unset (const.Dead + const.EngineOn)
            cycleState = cycleState + const.Standby
         else cycleState = const.Standby
         end
         dmz.object.state (hil, nil, cycleState)
         if self.startPos then dmz.object.position (hil, nil, self.startPos) end
         if self.startOri then dmz.object.orientation (hil, nil, self.startOri) end
         dmz.object.velocity (hil, nil, {0, 0, 0})
      elseif State:contains (const.GameActive) and
            not PreviousState:contains (const.GameActive) then
         local cycleState = dmz.object.state (hil)
         if cycleState then
            cycleState:unset (const.Dead + const.Standby)
            cycleState = cycleState + const.EngineOn
         else cycleState = const.EngineOn
         end
         dmz.object.state (hil, nil, cycleState)        
      end
   end
end

local function link_objects (self, Link, Attribute, Super, Sub)
   local SuperType = dmz.object.type (Super)
   local hil = dmz.object.hil ()
   if SuperType and Sub == hil then
      if SuperType:is_of_type (const.StartPointType) then
         self.active = true
         self.startPos = dmz.object.position (Super)
         self.startOri = dmz.object.orientation (Super)
         if self.mcp then
            local mcpState = dmz.object.state (self.mcp)
            if mcpState then update_object_state (self, self.mcp, nil, mcpState) end
         end
      elseif SuperType:is_of_type (const.WaitPointType) then
         self.active = false
         local cycleState = dmz.object.state (hil)
         if cycleState then
            cycleState.unset (const.Dead + Engine_On)
            cycleState = cycleState + const.Standby
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
   self.objObs:register (const.StartLinkHandle, callbacks, self)
   local hil = dmz.object.hil ()
   if hil then dmz.object.state (hil, nil, const.Dead) end
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

