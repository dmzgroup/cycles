require "const"

local function next_turn (FrameTime)
   return FrameTime + (math.random () * 4) + 0.5
end

local function random_speed (self)
   return self.NormalSpeed + (-5 + (10 * math.random ()))
end

local function test_distance (object, pos, heading)
   local result = 0
   pos = dmz.vector.new (pos:get_x (), pos:get_y () + 0.2, pos:get_z ())
   local ori = dmz.matrix.new (const.Up, heading)
   local dir = dmz.vector.new (const.Forward)
   dir = ori:transform (dir)

   dmz.isect.disable_isect (object)
   local isectResults = dmz.isect.do_isect (
      { type = dmz.isect.RayTest, start = pos, vector = dir, },
      { type = dmz.isect.ClosestPoint, })
   if isectResults and isectResults[1] then result = isectResults[1].distance end
   dmz.isect.enable_isect (object)
   return result
end

local function calculate_orientation (self, object, info, pos, ori)

   local FrameTime = dmz.time.frame_time ()

   local result = dmz.matrix.new (ori)

   if not info.lastTurnTime then
      info.lastTurnTime = FrameTime
      info.nextTurnTime = next_turn (FrameTime)
   elseif (FrameTime - info.lastTurnTime) > 0.2 then

      local forceTurn = false
      if info.nextTurnTime <  FrameTime then
         forceTurn = true
      end
      local dir = ori:transform (const.Forward)
      dir:set_y (0)

      if not dir:is_zero () then
         dir = dir:normalize ()
         local heading = const.Forward:get_angle (dir)
         local cross =  const.Forward:cross (dir)
         if cross:get_y () < 0 then heading = dmz.math.TwoPi - heading end
         local remainder = math.fmod (heading, dmz.math.HalfPi)
         if remainder > (dmz.math.HalfPi / 2) then
            heading = heading + dmz.math.HalfPi - remainder
         else
            heading = heading - remainder
         end

         local forward = test_distance (object, pos, heading)
         if forceTurn or (forward < 2) then
            info.lastTurnTime = FrameTime
            info.nextTurnTime = next_turn (FrameTime)
            local right = test_distance (object, pos, heading - dmz.math.HalfPi)
            local left = test_distance (object, pos, heading + dmz.math.HalfPi)
            if right > left then
               if right > forward then heading = heading - dmz.math.HalfPi end
            elseif left > forward then heading = heading + dmz.math.HalfPi
            end
         end
         result:from_axis_and_angle (const.Up, heading)
      end
   end

   return result
end

local function set_throttle (self, object, info)
   if object then
      local throttle = 1
      if (info.speed < self.NormalSpeed) and (self.MinSpeed > 0) then
         throttle = throttle -
            (((self.NormalSpeed - info.speed) / (self.NormalSpeed - self.MinSpeed)) * 0.4)
      elseif info.speed > self.NormalSpeed then
         throttle = throttle +
            (((info.speed - self.NormalSpeed) / (self.MaxSpeed - self.NormalSpeed)) * 0.6)
      end
      dmz.object.scalar (object, self.throttleHandle, throttle)
   end
end

local function test_move (self, object, origPos, pos, ori)
   local result = true
   if object then
      dmz.isect.disable_isect (object)
      local deathPoint = nil
      local target = nil
      local left = ori:transform (const.Left * 0.5) + pos
      local right = ori:transform (const.Right * 0.5) + pos
      local wiskerResults = dmz.isect.do_isect (
         { type = dmz.isect.SegmentTest, start = right, vector = left, },
         { type = dmz.isect.ClosestPoint, })
      if wiskerResults and wiskerResults[1] then
         deathPoint = wiskerResults[1].point
         target = wiskerResults[1].object
         result = false
      else
         local offset = const.Forward * 0.4
         local rot = dmz.matrix.new (const.Forward, pos - origPos)
         offset = rot:transform (offset)
         origPos = dmz.vector.new (origPos)
         origPos:set_y (origPos:get_y () + 0.5)
         origPos:set_z (origPos:get_z ())
         origPos = origPos - offset
         pos = dmz.vector.new (pos)
         pos:set_y (pos:get_y () + 0.5)
         pos = pos - offset
 
         local isectResults = dmz.isect.do_isect (
            { type = dmz.isect.SegmentTest, start = origPos, vector = pos, },
            { type = dmz.isect.ClosestPoint, })
         if isectResults and isectResults[1] then
            deathPoint = isectResults[1].point
            target = isectResults[1].object
            result = false
         end
      end
      if deathPoint then
         local state = dmz.object.state (object)
         if not state then state = dmz.mask.new () end
         state:unset (const.CycleState)
         state = state + const.Dead
         dmz.object.state (object, nil, state)
         dmz.object.velocity (object, nil, {0, 0, 0})
         local Event = dmz.event.open_collision (object, target)
         dmz.event.position (Event, nil, deathPoint)
         dmz.event.close (Event)
      end
      dmz.isect.enable_isect (object)
   end
   return result
end

local function update_time_slice (self, time)

   for object, info in pairs (self.objects) do

      local state = dmz.object.state (object)

      if state and state:contains (const.EngineOn) then

         local pos = dmz.object.position (object)
         local vel = dmz.object.velocity (object)
         local ori = dmz.object.orientation (object)

         if not pos then pos = dmz.vector.new () end
         if not vel then vel = dmz.vector.new () end
         if not ori then ori = dmz.matrix.new () end

         ori = calculate_orientation (self, object, info, pos, ori)

         local dir = ori:transform (dmz.vector.forward ())

         set_throttle (self, object, info)

         vel = dir * (info.speed)
         local origPos = pos
         pos = pos + (vel * time)

         local passed =
            ((info.speed > 0) and test_move (self, object, origPos, pos, ori) or true)

         dmz.object.position (object, nil, (passed and pos or origPos))
         dmz.object.velocity (object, nil, (passed and vel or {0, 0, 0}))
         dmz.object.orientation (object, nil, ori)
      end
   end
end

local function create_object (self, Object, Type)
   if Type:is_of_type (const.MCPType) then self.mcp = Object
   elseif Type:is_of_type (const.DroneType) then
   end
end

local function destroy_object (self, Object)

end

local function update_object_state (self, Object, Attribute, State, PreviousState)
   if not PreviousState then PreviousState = const.EmptyState end
   local info = self.objects[Object]
   if info then
      if State:contains (const.Standby) and
            not PreviousState:contains (const.Standby) then
         if info.pos and info.ori then
            dmz.object.position (Object, nil, info.pos)
            dmz.object.orientation (Object, nil, info.ori)
            dmz.object.velocity (Object, nil, {0, 0, 0})
            info.speed = random_speed (self)
         end
      end
   elseif Object == self.mcp then
      local newState = nil
      if State:contains (const.GameWaiting) and
            not PreviousState:contains (const.GameWaiting) then
         newState = const.Standby
      elseif State:contains (const.GameActive) and
            not PreviousState:contains (const.GameActive) then
         newState = const.EngineOn
      end
      if newState then
         local FrameTime = dmz.time.frame_time ()
         for obj, info in pairs (self.objects) do
            info.lastTurnTime = FrameTime
            info.nextTurnTime = next_turn (FrameTime)
            if info.startObject then
               local cycleState = dmz.object.state (obj)
               if not cycleState then cycleState = dmz.mask.new () end
               cycleState:unset (const.CycleState)
               cycleState = cycleState + newState
               dmz.object.state (obj, nil, cycleState)
            end
         end
      end
   end
end

local function link_objects (self, Link, Attribute, Super, Sub)
   local SuperType = dmz.object.type (Super)
   local info = self.objects[Sub]
   if SuperType and info then
      if SuperType:is_of_type (const.StartPointType) then
         info.startObject = Super
         info.pos = dmz.object.position (Super)
         info.ori = dmz.object.orientation (Super)
         local cycleState = dmz.object.state (Sub)
         if not cycleState then cycleState = dmz.mask.new () end
         cycleState:unset (const.CycleState)
         cycleState = cycleState + const.Standby
         dmz.object.state (Sub, nil, cycleState)
      else
         
      end
   end
end

local function unlink_objects (self, Link, Attribute, Super, Sub)
   local info = self.objects[Sub]
   if info and info.startObject == Super then
      local cycleState = dmz.object.state (Sub)
      if not cycleState then cycleState = dmz.mask.new () end
      cycleState:unset (const.CycleState)
      cycleState = cycleState + const.Dead
      dmz.object.state (Sub, nil, cycleState)
      info.startObject = nil
      info.pos = nil
      info.ori = nil
   end
end

local function start (self)

   self.handle = self.timeSlice:create (update_time_slice, self, self.name)

   for ix = 1, self.droneCount do
      local object = dmz.object.create (const.DroneType)
      if object then
         self.objects[object] = { speed = random_speed (self), }
         dmz.object.state (object, nil, const.Dead)
         dmz.object.position (object, nil, {0, 0, 0})
         dmz.object.activate (object)
         dmz.object.set_temporary (object)
      end
   end

   local callbacks = {
      create_object = create_object,
      destroy_object = destroy_object,
      update_object_state = update_object_state,
   }

   self.objObs:register (nil, callbacks, self)

   callbacks = {
      link_objects = link_objects,
      unlink_objects = unlink_objects,
    }

   self.objObs:register (const.StartLinkHandle, callbacks, self)
end

local function stop (self)
   if self.handle and self.timeSlice then self.timeSlice:destroy (self.handle) end
end


function new (config, name)
   local self = {
      throttleHandle = dmz.handle.new (
         config:to_string ("throttle.name", "throttle")),
      Acceleration = config:to_number ("speed.acceleration", 10),
      Deceleration = config:to_number ("speed.deceleration", -10),
      MinSpeed = config:to_number ("speed.min", 25),
      NormalSpeed = config:to_number ("speed.normal", 45),
      MaxSpeed = config:to_number ("speed.max", 55),
      start_plugin = start,
      stop_plugin = stop,
      name = name,
      log = dmz.log.new ("lua." .. name),
      objObs = dmz.object_observer.new (),
      timeSlice = dmz.time_slice.new (),
      config = config,
      droneCount = config:to_number ("count.value", 1),
      objects = {},
   }

   if self.MinSpeed > self.MaxSpeed then
      self.log:warn ("Max Speed is less than Minimum Speed")
      self.MaxSpeed = self.MinSpeed
   end

   if self.Acceleration < 0 then self.Acceleration = -self.Acceleration end
   if self.Deceleration > 0 then self.Deceleration = -self.Deceleration end
      
   self.log:info ("Creating plugin: " .. name)
   
   return self
end

