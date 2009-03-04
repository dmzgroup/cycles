require "const"

local CountScale = 3.0
local GScale = 1.5

local function update_time_slice (self, time)

   local v1 = 10
   local v2 = 10
   local v3 = 10

   local hil = dmz.object.hil ()

   if hil then
      if self.digitstate == 1 then
         if self.active > 0 then

            local state = dmz.object.state (hil)

            if state and state:contains (const.EngineOn) then

               local vel = dmz.object.velocity (hil)

               if not vel then vel = dmz.vector.new () end

               local speed = vel:magnitude () * 3.6;

               v1 = dmz.math.get_digit (speed, 0)
               v2 = dmz.math.get_digit (speed, 1)
               v3 = dmz.math.get_digit (speed, 2)
            end
         end
      else
         local count = 0
         if self.digitstate == 2 then
            count = dmz.object.counter (hil, const.WinsHandle)
         elseif self.digitstate == 3 then
            count = dmz.object.counter (hil, const.KillsHandle)
         elseif self.digitstate == 4 then
            count = dmz.object.counter (hil, const.DeathsHandle)
         end

         if not count then count = 0 end

         v1 = dmz.math.get_digit (count, 0)
         v2 = dmz.math.get_digit (count, 1)
         v3 = dmz.math.get_digit (count, 2)
      end
   end

   if v3 == 0 then
      v3 = 10
      if v2 == 0 then v2 = 10 end
   end

   dmz.overlay.enable_single_switch_state (self.digits[1], v1);
   dmz.overlay.enable_single_switch_state (self.digits[2], v2);
   dmz.overlay.enable_single_switch_state (self.digits[3], v3);

   if self.currentCount then
      local scale = dmz.overlay.scale (self.currentCount);
      if scale then
         scale = scale - (time * CountScale)
         if scale < 0.01 then scale = 0.01 end
         dmz.overlay.scale (self.currentCount, scale)
      end
   end

   if self.goactive then
      local scale = dmz.overlay.scale (self.gameover)
      if scale < GScale then
         scale = scale + (GScale * time);
         if scale > GScale then scale = GScale end
         dmz.overlay.scale (self.gameover, scale)
         local rot = dmz.overlay.rotation (self.gameover)
         rot = rot - (dmz.math.TwoPi * time * 3)
         if rot < 0 then rot = dmz.math.TwoPi + rot end
         dmz.overlay.rotation (self.gameover, rot)
      else
         dmz.overlay.scale (self.gameover, GScale)
         dmz.overlay.rotation (self.gameover, 0)
         dmz.overlay.enable_single_switch_state (self.gswitch, 2, true)
      end
   end

   if self.slider then
      if time > 0.1 then cprint (time) time = 0.1 end
      if self.dashstate then
         local x = dmz.overlay.position (self.slider)
         if x > 0 then x = x - (400 * time) end
         if x < 0 then x = 0 end
         dmz.overlay.position (self.slider, x, 0)
      else
         local x = dmz.overlay.position (self.slider)
         if x < 300 then x = x + (400 * time) end
         if x > 300 then x = 300 end
         dmz.overlay.position (self.slider, x, 0)
      end
   end
end

local function receive_input_event (self, event)

   if event.state then 
      if event.state.active then  self.active = self.active + 1
      else self.active = self.active - 1 end

      if self.active == 1 then
         self.timeSlice:start (self.handle)
      elseif self.active == 0 then
         self.timeSlice:stop (self.handle)
      end
   end

   if event.button then
      if event.button.which == 2 and event.button.value then
         self.dashstate = not self.dashstate
      elseif event.button.which == 3 and event.button.value then
         self.digitstate = self.digitstate + 1
         if self.digitstate > 4 then self.digitstate = 1 end
      end
   end
end

local function create_object (self, Object, Type)
   if Type:is_of_type (const.MCPType) then self.mcp = Object end
end

local function destroy_object (self, Object)

end

local function update_object_state (self, Object, Attribute, State, PreviousState)
   if Object == self.mcp then
      if not PreviousState then PreviousState = dmz.mask.new () end
      if State:contains (const.GameCountdown5)
            and not PreviousState:contains (const.GameCountdown5) then
         dmz.overlay.enable_single_switch_state (self.switch, 5)
         self.currentCount = self.countdown[5]
         dmz.overlay.scale (self.currentCount, CountScale)
         dmz.overlay.all_switch_state (self.waiting, false)
         dmz.overlay.all_switch_state (self.gswitch, false)
         self.goactive = false;
      elseif State:contains (const.GameCountdown4)
            and not PreviousState:contains (const.GameCountdown4) then
         dmz.overlay.enable_single_switch_state (self.switch, 4)
         self.currentCount = self.countdown[4]
         dmz.overlay.scale (self.currentCount, CountScale)
      elseif State:contains (const.GameCountdown3)
            and not PreviousState:contains (const.GameCountdown3) then
         dmz.overlay.enable_single_switch_state (self.switch, 3)
         self.currentCount = self.countdown[3]
         dmz.overlay.scale (self.currentCount, CountScale)
      elseif State:contains (const.GameCountdown2)
            and not PreviousState:contains (const.GameCountdown1) then
         dmz.overlay.enable_single_switch_state (self.switch, 2)
         self.currentCount = self.countdown[2]
         dmz.overlay.scale (self.currentCount, CountScale)
      elseif State:contains (const.GameCountdown1)
            and not PreviousState:contains (const.GameCountdown1) then
         dmz.overlay.enable_single_switch_state (self.switch, 1)
         self.currentCount = self.countdown[1]
         dmz.overlay.scale (self.currentCount, CountScale)
      elseif State:contains (const.GameActive)
            and not PreviousState:contains (const.GameActive) then
         dmz.overlay.all_switch_state (self.switch, false)
         self.currentCount = nil
      end

      if State:contains (const.GameWaiting)
            and PreviousState:contains (const.GameActive) then
         dmz.overlay.scale (self.gameover, 0.01)
         dmz.overlay.enable_single_switch_state (self.gswitch, 1, true)
         self.goactive = true;
      end
   end
end


local function start (self)
   self.handle = self.timeSlice:create (update_time_slice, self, self.name)

   self.inputObs:init_channels (
      self.config,
      dmz.input.Button + dmz.input.ChannelState,
      receive_input_event,
      self);

   if self.handle and self.active == 0 then self.timeSlice:stop (self.handle) end

   local callbacks = {
      create_object = create_object,
      destroy_object = destroy_object,
      update_object_state = update_object_state,
   }
   self.objObs:register (nil, callbacks, self)
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
      objObs = dmz.object_observer.new (),
      active = 0,
      config = config,
      digits = {
         dmz.overlay.lookup_clone_sub_handle ("digit1", "switch"),
         dmz.overlay.lookup_clone_sub_handle ("digit2", "switch"),
         dmz.overlay.lookup_clone_sub_handle ("digit3", "switch"),
      },
      switch = dmz.overlay.lookup_handle ("countdown switch"),
      countdown = {
         dmz.overlay.lookup_handle ("one"),
         dmz.overlay.lookup_handle ("two"),
         dmz.overlay.lookup_handle ("three"),
         dmz.overlay.lookup_handle ("four"),
         dmz.overlay.lookup_handle ("five"),
      },
      slider = dmz.overlay.lookup_handle ("dashboard slider"),
      dashstate = true,
      digitstate = 1,
      waiting = dmz.overlay.lookup_handle ("waiting switch"),
      gameover = dmz.overlay.lookup_handle ("gameover transform"),
      gswitch = dmz.overlay.lookup_handle ("gameover switch"),
   }

   self.log:info ("Creating plugin: " .. name)
   
   return self
end

