var dmz =
       { object: require("dmz/components/object")
       , time: require("dmz/runtime/time")
       , consts: require("const")
       , input: require("dmz/components/input")
       , portal: require("dmz/components/portal")
       , vector: require("dmz/types/vector")
       , defs: require("dmz/runtime/definitions")
       , matrix: require("dmz/types/matrix")
       , util: require("dmz/types/util")
       , overlay: require("dmz/components/overlay")
       , mask: require("dmz/types/mask")
       }

  , CountScale = 3.0
  , GScale = 1.5
  , SliderSpeed = 3.0
  , DigitState = 0
  , Active = 0
  , MCP = null
  , CurrentCount = null
  , GoActive = null

  , Active = 0
  , Digits =
       [ dmz.overlay.lookup("digit1").lookup("switch")
       , dmz.overlay.lookup("digit2").lookup("switch")
       , dmz.overlay.lookup("digit3").lookup("switch")
       ]
  , CDSwitch = dmz.overlay.lookup("countdown switch")
  , CountDown =
       [ dmz.overlay.lookup("one")
       , dmz.overlay.lookup("two")
       , dmz.overlay.lookup("three")
       , dmz.overlay.lookup("four")
       , dmz.overlay.lookup("five")
       ]
  , Slider = dmz.overlay.lookup("dashboard slider")
  , DashState = true
  , Waiting = dmz.overlay.lookup("waiting switch")
  , GameOver = dmz.overlay.lookup("gameover transform")
  , GSwitch = dmz.overlay.lookup("gameover switch")
  , SpeedSwitch = dmz.overlay.lookup("speed switch")
  , WinsSwitch = dmz.overlay.lookup("wins switch")
  , KillsSwitch = dmz.overlay.lookup("kills switch")
  , DeathsSwitch = dmz.overlay.lookup("deaths switch")

  , timeSlice
  , updateTimeSlice
  ;

updateTimeSlice = function (time) {

   var v0 = 10
     , v1 = 10
     , v2 = 10
     , hil = dmz.object.hil()
     , state
     , vel
     , speed
     , count
     , scale
     , rot
     , x
     ;

   if (hil) {

      if (DigitState === 0) {

         if (Active > 0) {

            state = dmz.object.state(hil);

            if (state && state.contains(dmz.consts.EngineOn)) {

               vel = dmz.object.velocity(hil);

               if (!vel) { vel = dmz.vector.create(); }

               speed = vel.magnitude() * 3.6;

               v0 = (speed % 10);
               v1 = (speed % 100) / 10;
               v2 = (speed % 1000) / 100;
            }
         }
      }
      else {

         count = 0;

         if (DigitState === 1) {

            count = dmz.object.counter(hil, dmz.consts.WinsHandle)
         }
         else if (DigitState === 2) {

            count = dmz.object.counter(hil, dmz.consts.KillsHandle)
         }
         else if (DigitState === 3) {

            count = dmz.object.counter(hil, dmz.consts.DeathsHandle)
         }

         if (!count) { count = 0 }

         v0 = (count % 10);
         v1 = Math.floor((count % 100) / 10);
         v2 = Math.floor((count % 1000) / 100);
      }
   }

   if (v2 === 0) {

      v2 = 10;

      if (v1 === 0) { v1 = 10; }
   }

   Digits[0].enableSingleSwitchState(v0);
   Digits[1].enableSingleSwitchState(v1);
   Digits[2].enableSingleSwitchState(v2);

   if (CurrentCount) {

      scale = CurrentCount.scale()[0];

      if (scale) {

         scale -= (time * CountScale);
         if (scale < 0.01) { scale = 0.01; }
         CurrentCount.scale(scale);
      }
   }

   if (GoActive) {

      scale = GameOver.scale()[0];

      if (scale < GScale) {

         scale += (GScale * time);
         if(scale > GScale) { scale = GScale; }
         GameOver.scale(scale);
         rot = GameOver.rotation();
         rot -= (Math.PI * 2 * time * 3);
         if (rot < 0) { rot += (Math.PI * 2); }
         GameOver.rotation(rot);
      }
      else {

         GameOver.scale(GScale);
         GameOver.rotation(0);
         GSwitch.enableSingleSwitchState(2, true);
      }
   }

   if (Slider) {

      if (DashState) {

         x = Slider.position()[0];
         if (x > 0) { x -= (400 * time * SliderSpeed); }
         if (x < 0) { x = 0; }
         Slider.position(x, 0);
      }
      else {

         x = Slider.position()[0];
         if (x < 300) { x += (400 * time * SliderSpeed); }
         if (x > 300) { x = 300; }
         Slider.position(x, 0);
      }
   }
};

dmz.input.channel.observe(self, function (channel, state) {

   if (state) {  Active += 1; }
   else { Active -= 1; }

   if (Active === 1) { timeSlice = dmz.time.setRepeatingTimer(self, updateTimeSlice); }
   else if (Active === 0) { dmz.time.cancleTimer(self, timeSlice); }
});

dmz.input.button.observe(self, function (channel, button) {

   if ((button.id === 2) && button.value) {

      DashState = !DashState;
   }
   else if ((button.id === 3) && button.value) {

      DigitState += 1;

      if (DigitState > 3) { DigitState = 0; }

      SpeedSwitch.enableSingleSwitchState(DigitState === 0 ? 0 : 1)
      WinsSwitch.enableSingleSwitchState(DigitState === 1 ? 0 : 1)
      KillsSwitch.enableSingleSwitchState(DigitState === 2 ? 0 : 1)
      DeathsSwitch.enableSingleSwitchState(DigitState === 3 ? 0 : 1)
   }
});

dmz.object.create.observe(self, function (obj, Type) {

   if (Type.isOfType(dmz.consts.MCPType)) { MCP = obj; }
});

dmz.object.state.observe(self, function (obj, Attribute, State, PreviousState) {

   if (obj === MCP) {

      if (!PreviousState) { PreviousState = dmz.mask.create(); }

      if (State.contains(dmz.consts.GameCountdown5)
            && !PreviousState.contains(dmz.consts.GameCountdown5)) {

         CDSwitch.enableSingleSwitchState(5);
         CurrentCount = CountDown[4];
         CurrentCount.scale(CountScale);
         Waiting.setSwitchStateAll(false);
         GSwitch.setSwitchStateAll(false);
         GoActive = false;
      }
      else if (State.contains(dmz.consts.GameCountdown4)
            && !PreviousState.contains(dmz.consts.GameCountdown4)) {

         CDSwitch.enableSingleSwitchState(4);
         CurrentCount = CountDown[3];
         CurrentCount.scale(CountScale);
      }
      else if (State.contains(dmz.consts.GameCountdown3)
            && !PreviousState.contains(dmz.consts.GameCountdown3)) {

         CDSwitch.enableSingleSwitchState(3);
         CurrentCount = CountDown[2];
         CurrentCount.scale(CountScale);
      }
      else if (State.contains(dmz.consts.GameCountdown2)
            && !PreviousState.contains(dmz.consts.GameCountdown2)) {

         CDSwitch.enableSingleSwitchState(2);
         CurrentCount = CountDown[1];
         CurrentCount.scale(CountScale);
      }
      else if (State.contains(dmz.consts.GameCountdown1)
            && !PreviousState.contains(dmz.consts.GameCountdown1)) {

         CDSwitch.enableSingleSwitchState(1);
         CurrentCount = CountDown[0];
         CurrentCount.scale(CountScale);
      }
      else if (State.contains(dmz.consts.GameActive)
            && !PreviousState.contains(dmz.consts.GameActive)) {

         CDSwitch.setSwitchStateAll(false);
         CurrentCount = null;
      }

      if (State.contains(dmz.consts.GameWaiting)
            && PreviousState.contains(dmz.consts.GameActive)) {

         GameOver.scale(0.01);
         GSwitch.enableSingleSwitchState(1, true);
         GoActive = true;
      }
   }
});
