require "const"

local function calculate_orientation (self, ori)

   local FrameTime = dmz.time.frame_time ()

   local result = dmz.matrix.new ()

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

      if dmz.math.is_zero (self.turn) then self.lastTurn = FrameTime - 0.8
      elseif (FrameTime - self.lastTurn) > 0.75 then
         if self.turn > 0.1 then
            heading = heading - dmz.math.HalfPi
            self.lastTurn = FrameTime
         elseif self.turn < -0.1 then
            heading = heading + dmz.math.HalfPi
            self.lastTurn = FrameTime
         else self.lastTurn = FrameTime - 0.6
         end
      end
      result:from_axis_and_angle (const.Up, heading)
   end

   return result
end

local function set_throttle (self, object)
   if object then
      local throttle = 1
      if (self.speed < self.NormalSpeed) and (self.MinSpeed > 0) then
         throttle = throttle -
            (((self.NormalSpeed - self.speed) / (self.NormalSpeed - self.MinSpeed)) * 0.4)
      elseif self.speed > self.NormalSpeed then
         throttle = throttle +
            (((self.speed - self.NormalSpeed) / (self.MaxSpeed - self.NormalSpeed)) * 0.6)
      end
      dmz.object.scalar (object, self.throttleHandle, throttle)
   end
end

local function test_move (self, object, origPos, pos)
   local result = true
   if object then
      local offset = const.Forward * 0.4
      local rot = dmz.matrix.new (const.Forward, pos - origPos)
      rot:transform (offset)
      dmz.isect.disable_isect (object)
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
         local state = dmz.object.state (object)
         if not state then state = dmz.mask.new () end
         state:unset (const.EngineOn)
         state = state + const.Dead
         dmz.object.state (object, nil, state)
         local Event = dmz.event.open_collision (object, isectResults[1].object)
         dmz.event.position (Event, nil, isectResults[1].point)
         --dmz.event.velocity (Event, nil, {0, 0, 0})
         dmz.event.close (Event)
         result = false
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

         ori = calculate_orientation (self, ori)

         local dir = ori:transform (dmz.vector.forward ())

         if self.accel > 0.1 then
            self.speed = self.speed + (self.Deceleration * time)
            if self.speed < self.MinSpeed then self.speed = self.MinSpeed end
         elseif self.accel < -0.1 then
            self.speed = self.speed + (self.Acceleration * time)
            if self.speed > self.MaxSpeed then self.speed = self.MaxSpeed end
         end

         set_throttle (self, object)

         vel = dir * (self.speed)
         local origPos = pos
         pos = pos + (vel * time)

         local passed = ((self.speed > 0) and test_move (self, object, origPos, pos) or true)

         dmz.object.position (object, nil, (passed and pos or origPos))
         dmz.object.velocity (object, nil, (passed and vel or {0, 0, 0}))
         dmz.object.orientation (object, nil, ori)
      end
   end
end

local function create_object (self, Object, Type)

end

local function destroy_object (self, Object)

end

local function update_object_state (self, Object, Attribute, State, PreviousState)

end

local function link_objects (self, Link, Attribute, Super, Sub)
end

local function unlink_objects (self, Link, Attribute, Super, Sub)
end

local function start (self)

   self.handle = self.timeSlice:create (update_time_slice, self, self.name)

   for ix = 1, self.droneCount do
      local object = dmz.object.create ("blue_ai")
      if object then
         self.objects[object] = {}
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
      turn = 0,
      speed = 0,
      accel = 0,
      start_plugin = start,
      stop_plugin = stop,
      name = name,
      log = dmz.log.new ("lua." .. name),
      objObs = dmz.object_observer.new (),
      timeSlice = dmz.time_slice.new (),
      config = config,
      droneCount = 1,
      objects = {},
   }

   self.speed = self.NormalSpeed

   if self.MinSpeed > self.MaxSpeed then
      self.log:warn ("Max Speed is less than Minimum Speed")
      self.MaxSpeed = self.MinSpeed
   end

   if self.Acceleration < 0 then self.Acceleration = -self.Acceleration end
   if self.Deceleration > 0 then self.Deceleration = -self.Deceleration end
      
   self.log:info ("Creating plugin: " .. name)
   
   return self
end

