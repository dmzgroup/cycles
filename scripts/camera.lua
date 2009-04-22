require "const"

local function update_time_slice (self, time)

   local hil = dmz.object.hil ()

   if hil and self.active > 0 then

      local state = dmz.object.state (hil)

      if state and state:contains (const.Dead) then
         if self.watch then
            local pos = dmz.vector.new (300, 50, 300)
            local ori = dmz.matrix.new (const.Forward, dmz.vector.new ({-1, 0, -1}))
            dmz.portal.set_view (pos, ori)
         end
      else
         self.watch = false
         local MaxTurn = (dmz.math.TwoPi * time)
         local pos = dmz.object.position (hil)
         local ori = dmz.object.orientation (hil)
         local dir = dmz.object.velocity (hil)

         if not pos then pos = dmz.vector.new () end
         if not ori then ori = dmz.matrix.new () end
         if not dir or dir:is_zero () then dir = ori:transform (const.Forward)
         else dir = dir:normalize ()
         end
         local heading = self.heading
         local prevOri = dmz.matrix.new (const.Up, self.heading)
         local prevDir = prevOri:transform (const.Forward)
         local headingDiff = prevDir:get_angle (dir)
         if headingDiff > MaxTurn then headingDiff = MaxTurn end
         if prevDir:cross (dir):get_y () < 0 then heading = heading - headingDiff
         else heading = heading + headingDiff
         end
         self.heading = heading
         if self.backMod then heading = heading + self.backMod
         elseif self.sideMod then heading = heading + self.sideMod
         end

         ori = dmz.matrix.new (const.Up, heading)
         pos = ori:transform (self.offset) + pos
         dmz.portal.set_view (pos, ori)
      end
   end
end

local function update_channel_state (self, channel, state)

   if state then  self.active = self.active + 1
   else self.active = self.active - 1 end

   if self.active == 1 then self.timeSlice:start (self.handle)
   elseif self.active == 0 then
      self.timeSlice:stop (self.handle)
      local hil = dmz.object.hil ()
      if hil then dmz.object.scalar (hil, self.throttleHandle, 0) end
   end
end

local function receive_axis_event (self, channel, axis)
   local value = 0
   if not dmz.math.is_zero (axis.value, 0.1) then
      if axis.value > 0 then value = 1
      else value = -1
      end
   end
   if axis.which == 2 then
      if value > 0 then self.backMod = dmz.math.Pi
      else self.backMod = nil
      end
   elseif axis.which == 1 then
   elseif axis.which == 6 then  
      if value > 0 then self.sideMod = dmz.math.HalfPi
      elseif value < 0 then self.sideMod = -dmz.math.HalfPi
      else self.sideMod = nil
      end
   elseif axis.which == 7 then 
   end
end

local function receive_button_event (self, channel, button)
   if button.which == 1 and button.value then self.watch = true 
   end
end

local function start (self)
   self.handle = self.timeSlice:create (update_time_slice, self, self.name)

   self.inputObs:register (
      self.config,
      {
         update_channel_state = update_channel_state,
         receive_axis_event = receive_axis_event,
         receive_button_event = receive_button_event,
      },
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
      offset = config:to_vector ("offset", {0.0, 3.0, 8.0}),
      heading = 0,
   }

   self.log:info ("Creating plugin: " .. name)
   
   return self
end

