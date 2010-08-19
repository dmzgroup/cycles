var dmz =
      { object : require("dmz/components/object")
      , time: require("dmz/runtime/time")
      , consts: require("const")
      , input: require("dmz/components/input")
      , portal: require("dmz/components/portal")
      , vector: require("dmz/types/vector")
      , defs: require("dmz/runtime/definitions")
      , matrix: require("dmz/types/matrix")
      , util: require("dmz/types/util")
      }

   , calculateOrientation
   , setThrottle
   , timeSliceFunction

   , throttleHandle = dmz.defs.createNamedHandle(
        self.config.string("throttle.name", "throttle"))
   , Acceleration = self.config.number ("Speed.acceleration", 10)
   , Deceleration = self.config.number ("Speed.deceleration", -10)
   , MinSpeed = self.config.number ("Speed.min", 27.78)
   , NormalSpeed = self.config.number ("Speed.normal", 41.67)
   , MaxSpeed = self.config.number ("Speed.max", 55.56)
   , Turn = 0
   , Speed = 0
   , Accel = 0
   , lastTurn = dmz.time.getFrameTime ()
   , timeSlice
   , Active = 0
   , Speed = NormalSpeed
   , wasAlive = false

   ;

(function () {
   if (MinSpeed > MaxSpeed) {
      self.log.warn ("Max Speed is less than Minimum Speed")
      MaxSpeed = MinSpeed;
   }
   if (Acceleration < 0) { Acceleration = -Acceleration; }
   if (Deceleration > 0) { Deceleration = -Deceleration; }

}());


calculateOrientation = function (ori) {

   var FrameTime = dmz.time.getFrameTime()
     , result = dmz.matrix.create()
     , dir = ori.transform (dmz.vector.Forward)
     , heading
     , cross
     , remainder
     ;

   dir.y = 0;

//     dir = dir.add([0, -dir.toArray()[1], 0]);

   if (!dir.isZero()) {
      dir = dir.normalize ();
      heading = dmz.vector.Forward.getAngle (dir);
      cross =  dmz.vector.Forward.cross(dir);
      if (cross.y < 0) { heading = (Math.PI * 2) - heading; }
      remainder = heading % (Math.PI / 2);
      if (remainder > (Math.PI / 4)) {
         heading += (Math.PI / 2) - remainder;
      }
      else {
         heading -= remainder;
      }
      if (dmz.util.isZero (Turn)) { lastTurn = FrameTime - 0.8; }
      else if ((FrameTime - lastTurn) > 0.75) {
         if (Turn > 0.1) {
            heading -= (Math.PI / 2);
            lastTurn = FrameTime;
         }
         else if (Turn < -0.1) {
            heading += (Math.PI / 2);
            lastTurn = FrameTime;
         }
         else { lastTurn = FrameTime - 0.6; }
      }
      result.fromAxisAndAngle (dmz.vector.Up, heading);
   }

   return result;
};

setThrottle = function (hil) {
   var throttle;
   if (!hil) { hil = dmz.object.hil (); }
   if (hil) {
      throttle = 1;
      if ((Speed < NormalSpeed) && (MinSpeed > 0)) {
         throttle -= ((NormalSpeed - Speed) / (NormalSpeed - MinSpeed)) * 0.4;
      }
      else if (Speed > NormalSpeed) {
         throttle += ((Speed - NormalSpeed) / (MaxSpeed - NormalSpeed)) * 0.6;
      }
      dmz.object.scalar (hil, throttleHandle, throttle);
   }
};

timeSliceFunction = function (time) {

   var hil = dmz.object.hil ()
     , state
     , pos
     , vel
     , ori
     , dir
     , origPos
     , passed

     ;

   if (hil && Active > 0) {

      state = dmz.object.state (hil);

      if (state && state.contains (dmz.consts.EngineOn)) {

         wasAlive = true;

         pos = dmz.object.position (hil);
         vel = dmz.object.velocity (hil);
         ori = dmz.object.orientation (hil);

         if (!pos) { pos = dmz.vector.create (); }
         if (!vel) { vel = dmz.vector.create (); }
         if (!ori) { ori = dmz.matrix.create (); }

         ori = calculateOrientation (ori);

         dir = ori.transform (dmz.vector.Forward);

         if (Accel > 0.1) {
            Speed += (Deceleration * time);
            if (Speed < MinSpeed) { Speed = MinSpeed; }
         }
         else if (Accel < -0.1) {
            Speed += (Acceleration * time);
            if (Speed > MaxSpeed) { Speed = MaxSpeed; }
         }

         setThrottle (hil);

         vel = dir.multiply(Speed);
         origPos = pos;
         pos = pos.add (vel.multiply(time));

         passed = ((Speed > 0) ? dmz.consts.testMove (hil, origPos, pos, ori) : true);

         dmz.object.position (hil, null, (passed ? pos : origPos));
         dmz.object.velocity (hil, null, (passed ? vel : dmz.vector.create()));
         dmz.object.orientation (hil, null, ori);
      }
      else if (wasAlive && state && (state.contains (dmz.consts.Dead) ||
            state.contains (dmz.consts.Standby))) {

         wasAlive = null;
         ori = dmz.object.orientation (hil);
         if (!ori) { ori = dmz.matrix.create (); }
         dir = ori.transform (dmz.vector.Forward);
         Speed = NormalSpeed;
         dmz.object.velocity (hil, null, dir * Speed);
      }
   }
};

dmz.input.channel.observe (self, function (channel, state) {
   var hil;

   if (state) { Active += 1; }
   else { Active -= 1; }

   if (Active === 1) { timeSlice = dmz.time.setRepeatingTimer(self, timeSliceFunction); }
   else if (Active === 0) {
      dmz.time.cancleTimer(timeSlice);
      hil = dmz.object.hil ()
      if (hil) { dmz.object.scalar (hil, throttleHandle, 0); }
   }
});

dmz.input.axis.observe (self, function (channel, axis) {
   var value = 0;
   if (dmz.util.isNotZero (axis.value)) {
      if (axis.value > 0) { value = 1; }
      else { value = -1; }
   }

   if (axis.id === 1) { Turn = value; }
   else if (axis.id === 7) { Accel = value; }
});
