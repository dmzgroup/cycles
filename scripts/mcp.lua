require "const"

local function create_start_points (self)
   local Distance = 10
   local Space = 5
   local Offset = math.modf (self.maxCycles / 4) + 1
   local Ident = dmz.matrix.new ()
   local HeadingPi = dmz.matrix.new (const.Up, dmz.math.Pi)
   local oddPos = { -(Space * Offset), 0, Distance }
   local evenPos = { -(Space * Offset) + (Space / 2), 0, -Distance }
   for ix = 1, self.maxCycles do
      local Odd = (1 == math.fmod (ix, 2))
      local point = {
         index = ix,
         pos = (Odd and oddPos or evenPos),
         ori = (Odd and Ident or HeadingPi),
         handle = dmz.object.create (const.StartPointType),
      }
      self.startPoints[ix] = point
      dmz.object.position (point.handle, nil, point.pos)
      dmz.object.orientation (point.handle, nil, point.ori)
      dmz.object.activate (point.handle)
      dmz.object.set_temporary (point.handle)
      if Odd then oddPos[1] = oddPos[1] + Space
      else evenPos[1] = evenPos[1] + Space
      end
   end
end

local function assign_points_to_cycles (self)
   self.playerCount = 0
   for object, cycle in pairs (self.cycleList) do
      if cycle.point then
         dmz.object.unlink_sub_links (cycle.point.handle, const.StartLinkHandle)
         cycle.point = nil
      elseif cycle.wait then
      end
   end
   local count = 1
   for object, cycle in pairs (self.cycleList) do
      if count <= self.maxCycles then
          cycle.point = self.startPoints[count]
          dmz.object.link (const.StartLinkHandle, cycle.point.handle, object)
          self.playerCount = self.playerCount + 1
      else
      end
      count = count + 1
   end
end

local function get_standby_count (self)
   local result = 0
   for object, cycle in pairs (self.cycleList) do
      if cycle.standby then result = result + 1 end
   end
   return result
end

local function get_dead_count (self)
   local result = 0
   for object, cycle in pairs (self.cycleList) do
      if cycle.dead then result = result + 1 end
   end
   return result
end

local function set_game_state (mcp, State)
   local newState = dmz.object.state (mcp)
   newState:unset (const.GameStateMask)
   newState = newState + State
   dmz.object.state (mcp, nil, newState)
end

local function update_time_slice (self, time)

   local State = dmz.object.state (self.mcp)

   if State then
      local CTime = dmz.time.frame_time ()
      if State:contains (const.GameWaiting) then
         if self.assignPoints then
            assign_points_to_cycles (self)
            self.assignPoints = false
         end
         if (get_standby_count (self) == self.playerCount) and
               (self.playerCount >= self.minCycles) then
self.log:error ("Move to Countdown 5")
            set_game_state (self.mcp, const.GameCountdown5)
            self.nextStateTime = CTime + 1
         end
      elseif State:contains (const.GameActive) then
         if get_dead_count (self) >= (self.playerCount - 1) then
            set_game_state (self.mcp, const.GameWaiting)
         end
      elseif State:contains (const.GameCountdown5) then
         if CTime >= self.nextStateTime then
self.log:error ("Move to Countdown 4")
            set_game_state (self.mcp, const.GameCountdown4)
            self.nextStateTime = CTime + 1
         end
      elseif State:contains (const.GameCountdown4) then
         if CTime >= self.nextStateTime then
self.log:error ("Move to Countdown 3")
            set_game_state (self.mcp, const.GameCountdown3)
            self.nextStateTime = CTime + 1
         end
      elseif State:contains (const.GameCountdown3) then
         if CTime >= self.nextStateTime then
self.log:error ("Move to Countdown 2")
            set_game_state (self.mcp, const.GameCountdown2)
            self.nextStateTime = CTime + 1
         end
      elseif State:contains (const.GameCountdown2) then
         if CTime >= self.nextStateTime then
self.log:error ("Move to Countdown 1")
            set_game_state (self.mcp, const.GameCountdown1)
            self.nextStateTime = CTime + 1
         end
      elseif State:contains (const.GameCountdown1) then
         if CTime >= self.nextStateTime then
self.log:error ("Move to Active")
            set_game_state (self.mcp, const.GameActive)
            self.nextStateTime = CTime + 1
         end
      else
         self.log.error ("Game in unknown state. Changing to a waiting state")
         set_game_state (self.mcp, const.GameWaiting)
      end
   end
end

local function create_object (self, Object, Type)
   if Type:is_of_type (const.CycleType) then
      self.cycleList[Object] = {}
      self.cycleCount = self.cycleCount + 1
      self.assignPoints = true
   end
end

local function destroy_object (self, Object)
   local cycle = self.cycleList[Object]
   if cycle then
      self.cycleList[Object] = nil
      self.cycleCount = self.cycleCount - 1
      if cycle.point then self.playerCount = self.playerCount - 1 end
      self.assignPoints = true
   end
end

local function update_object_state (self, Object, Attribute, State, PreviousState)
   local cycle = self.cycleList[Object]
   if cycle then
      if not PreviousState then PreviousState = const.EmptyState end
      if State:contains (const.Dead) and
            not PreviousState:contains (const.Dead) then
         cycle.dead = true
         cycle.standby = false
      elseif State:contains (const.Standby)
            and not PreviousState:contains (const.Standby) then
         cycle.dead = false
         cycle.standby = true
      else
         cycle.dead = false
         cycle.standby = false
      end
   end
end

local function start (self)
   self.handle = self.timeSlice:create (update_time_slice, self, self.name)
   local callbacks = {
      create_object = create_object,
      destroy_object = destroy_object,
      update_object_state = update_object_state,
   }
   self.objObs:register (nil, callbacks, self)
   self.mcp = dmz.object.create (const.MCPType)
   dmz.object.state (self.mcp, nil, const.GameWaiting)
   dmz.object.activate (self.mcp)
   dmz.object.set_temporary (self.mcp)
   create_start_points (self)
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
      cycleCount = 0,
      startPoints = {},
      maxCycles = config:to_number ("cycles.max", 6),
      minCycles = config:to_number ("cycles.min", 2),
   }

   self.log:info ("Creating plugin: " .. name)
   
   return self
end

