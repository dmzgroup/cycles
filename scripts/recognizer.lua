require "const"

local TargetHandle = dmz.handle.new ("Recognizer_Target_Counter")
local LocalSpeed = 80

local path = {
   dmz.vector.new {0.0, 1.0, 0.0},
   dmz.vector.new {0.0, 1.0, 1.0},
   dmz.vector.new {0.33333, 1.0, 1.0},
   dmz.vector.new {0.33333, 1.0, 0.0},
   dmz.vector.new {0.66667, 1.0, 0.0},
   dmz.vector.new {0.66667, 1.0, 1.0},
   dmz.vector.new {1.0, 1.0, 1.0},
   dmz.vector.new {1.0, 1.0, 0.0},
   dmz.vector.new {0.66667, 1.0, 0.0},
   dmz.vector.new {0.66667, 1.0, 1.0},
   dmz.vector.new {0.33333, 1.0, 1.0},
   dmz.vector.new {0.33333, 1.0, 0.0},
}

local Forward = dmz.vector.new {0.0, 0.0, -1.0}
local Right = dmz.vector.new {1.0, 0.0, 0.0}
local Up = dmz.vector.new {0.0, 1.0, 0.0}

local function rotate (time, orig, target)
   local diff = target - orig
   if diff > dmz.math.Pi then diff = diff - dmz.math.TwoPi
   elseif diff < -dmz.math.Pi then diff = diff + dmz.math.TwoPi
   end
   local max = time * dmz.math.Pi * 3
   if math.abs (diff) > max then
      if diff > 0 then target = orig + max
      else target = orig - max
      end
   end
   return target
end

local function new_ori (obj, time, targetVec)
   local result = dmz.matrix.new ()
   local hvec = dmz.vector.new (targetVec)
   hvec:set_y (0.0)
   hvec = hvec:normalize ()
   local heading = Forward:get_angle (hvec)
   local hcross = Forward:cross (hvec):normalize ()
   if hcross:get_y () < 0.0 then
      heading = dmz.math.TwoPi - heading
   end
   if heading > dmz.math.Pi then heading = heading - dmz.math.TwoPi
   elseif heading < -dmz.math.Pi then heading = heading + dmz.math.TwoPi
   end
   local ori = dmz.object.orientation (obj)
   if not ori then ori = dmz.matrix.new () end
   local dir = ori:transform (Forward)
   dir:set_y (0)
   local currentHeading = Forward:get_angle (dir)
   local cross = Forward:cross (dir)
   if cross:get_y () < 0 then currentHeading = dmz.math.TwoPi - currentHeading end
   heading = rotate (time, currentHeading, heading) 
   result = result:from_axis_and_angle (Up, heading);
   return result;
end

local function update_time_slice (self, time)
   for obj, _ in pairs (self.objects) do
      local pos = dmz.object.position (obj)
      if not pos then pos = dmz.vector.new () end

      local which = dmz.object.counter (obj, TargetHandle)
      local target = path[which]

      local max = time * LocalSpeed
      local offset = target - pos
      local distance = offset:magnitude ()
      local delta = distance
      if delta > max then delta = max end
      offset = offset:normalize ()
      pos = pos + (offset * delta)
      if dmz.math.is_zero (distance, 1.0) then
         which = which + 1
         if which > #path then which = 1 end
         dmz.object.counter (obj, TargetHandle, which)
      end
      dmz.object.position (obj, nil, pos)
      dmz.object.orientation (obj, nil, new_ori (obj, time, offset))
      dmz.object.velocity (obj, nil, offset * LocalSpeed)
   end
end

local function destroy_object (self, obj)
   self.objects[obj] = nil
end

local function update_object_flag (self, obj, attr, value)
   self.objects[obj] = true
   local pos = dmz.object.position (obj)
   if not pos then pos = dmz.vector.new () end
   local target = 1
   local offset = math.huge
   for index, value in ipairs (path) do
      local distance = (value - pos):magnitude ()
      if offset > distance then
         offset = distance 
         target = index
      end
   end
   dmz.object.counter (obj, TargetHandle, target);
end

local function start (self)
   self.handle = self.timeSlice:create (update_time_slice, self, self.name)
   self.objObs:register (nil, {destroy_object = destroy_object,}, self)
   self.objObs:register (
      "Recognizer_Controlled",
      {update_object_flag = update_object_flag,},
      self)
end


local function stop (self)
   if self.handle and self.timeSlice then self.timeSlice:destroy (self.handle) end
end


function new (config, name)
   local self = {
      start_plugin = start,
      stop_plugin = stop,
      name = name,
      log = dmz.log.new ("lua." .. name),
      timeSlice = dmz.time_slice.new (),
      objObs = dmz.object_observer.new (),
      config = config,
      objects = {},
   }

   self.log:info ("Creating plugin: " .. name)

   local min = config:to_number ("min", -250)
   local max = config:to_number ("min", 250)
   local offset = max - min
   local height = config:to_number ("height", 35)

   for index, value in ipairs (path) do
      path[index] = dmz.vector.new (
         (value:get_x () * offset) + min,
         value:get_y () * height,
         (value:get_z () * offset) + min)
   end
   
   return self
end

