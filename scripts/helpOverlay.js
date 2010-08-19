var dmz =
      { object: require("dmz/components/object")
      , time: require("dmz/runtime/time")
      , consts: require("const")
      , input: require("dmz/components/input")
      , overlay: require("dmz/components/overlay")
      }

   , Speed = 3
   , Scaling = false
   , Transform = dmz.overlay.lookup("help")
   , Active = 0
   , Switch = dmz.overlay.lookup("help switch")
   , Show = false
   , HKey = dmz.input.key.toValue ("h")
   , hKey = dmz.input.key.toValue ("H")
   , SlashKey = dmz.input.key.toValue ("/")
   , QuestionKey = dmz.input.key.toValue ("?")

   , timeSlice
   , updateTimeSlice

   ;


(function() { Transform.scale(0.1);}());


updateTimeSlice = function (time) {
   var scale;

   if (Scaling) {
      scale = Transform.scale()[0];
      if (Show) {
         scale += (time * Speed);
         if (scale >= 1) {
            scale = 1;
            Scaling = false;
         }
      }
      else {
         scale -= (time * Speed);
         if (scale <= 0.01) {
            scale = 0.01;
            Scaling = false;
            Switch.enableSingleSwitchState (0);
         }
      }
      Transform.scale(scale);

   }
};

dmz.input.channel.observe (self, function (channel, state) {
   if (state) {  Active += 1; }
   else { Active -= 1; }

   if (Active === 1) {
      timeSlice = dmz.time.setRepeatingTimer (self, updateTimeSlice);
   }
   else if (Active === 0) {
      dmz.time.setRepeatingTimer (self, timeSlice);
   }
});

dmz.input.key.observe (self, function (channel, key) {
   if (key.state) {
      if ((HKey === key.key) || (hKey === key.key) ||
            (SlashKey === key.key) || (QuestionKey === key.key)) {
         Show = !Show;
         Scaling = true;
         if (Show) {
            Switch.enableSingleSwitchState(1);
         }
      }
   }
});
