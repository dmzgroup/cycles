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
      , isect: require("dmz/components/isect")
      }

   , MCP
   , throttleHandle = dmz.defs.createNamedHandle(
                      self.config.string("throttle.name", "throttle"))
   , Acceleration = self.config.number("speed.acceleration", 10)
   , Deceleration = self.config.number ("speed.deceleration", -10)
   , MinSpeed = self.config.number ("speed.min", 25)
   , NormalSpeed = self.config.number ("speed.normal", 45)
   , MaxSpeed = self.config.number ("speed.max", 55)
   , timeSlice
   , droneCount = self.config.number ("count.value", 1)
   , objs = {}

   , nextTurn = function (FrameTime) {
        return FrameTime + (Math.random () * 4) + 0.5;
     }

   , randomSpeed = function () {
        return NormalSpeed + (-5 + (10 * Math.random ()));
     }
   , testDistance
   , calculateOrientation
   , setThrottle
   , updateTimeSlice

   ;

(function () {

   var ix = 0
     , obj
     ;

   if (MinSpeed > MaxSpeed) {
      self.log.warn ("Max Speed is less than Minimum Speed");
      MaxSpeed = MinSpeed;
   }

   if (Acceleration < 0) { Acceleration = -Acceleration; }
   if (Deceleration > 0) { Deceleration = -Deceleration; }

   for (ix = 0; ix < droneCount; ix += 1) {
      obj = dmz.object.create (
            dmz.consts.CycleTypeList[
               dmz.util.randomInt (0, dmz.consts.CycleTypeList.length - 1)]);
      if (obj) {
         objs[obj] = { speed: randomSpeed () };
//         self.log.warn("added", obj);
         dmz.object.state (obj, null, dmz.consts.Dead);
         dmz.object.position (obj, null, [0, 0, 0]);
         dmz.object.flag (obj, dmz.consts.DroneHandle, true);
         dmz.object.activate (obj);
      }
   }


}());

testDistance = function (obj, pos, heading) {
   var result = 0
     , ori = dmz.matrix.create()
     , dir
     , isectResults
     ;

   pos = dmz.vector.create(pos.toArray());
   ori.fromAxisAndAngle(dmz.consts.Up, heading);
   dir = dmz.vector.create(dmz.consts.Forward);
   dir = ori.transform (dir);

   dmz.isect.disable (obj);
   isectResults = dmz.isect.doIsect ({start: pos, direction: dir });
   if (isectResults && isectResults[0]) { result = isectResults[0].distance; }
   dmz.isect.enable (obj);
   return result;
}

calculateOrientation = function (obj, info, pos, ori) {

   var FrameTime = dmz.time.getFrameTime ()
     , result = dmz.matrix.create(ori)
     , dir
     , forceTurn
     , heading
     , cross
     , remainder
     , forward
     , right
     , left

     ;

   if (!info.lastTurnTime) {
      info.lastTurnTime = FrameTime;
      info.nextTurnTime = nextTurn (FrameTime);
   }
   else if ((FrameTime - info.lastTurnTime) > 0.2) {

      forceTurn = false;
      if (info.nextTurnTime <  FrameTime) {
         forceTurn = true;
      }
      dir = ori.transform (dmz.consts.Forward);
      dir = dir.add([0, -dir.toArray()[1], 0]);

      if (!dir.isZero()) {
         dir = dir.normalize ();
         heading = dmz.consts.Forward.getAngle (dir);
         cross =  dmz.consts.Forward.cross(dir).toArray();
         if (cross[1] < 0) { heading = (Math.PI * 2) - heading; }
         remainder = heading % (Math.PI / 2);
         if (remainder > (Math.PI / 4)) {
            heading += (Math.PI / 2) - remainder
         }
         else {
            heading -= remainder;
         }

         forward = testDistance (obj, pos, heading);
         if (forceTurn || (forward < 2)) {
            info.lastTurnTime = FrameTime;
            info.nextTurnTime = nextTurn (FrameTime);
            right = testDistance (obj, pos, heading - (Math.PI / 2));
            left = testDistance (obj, pos, heading + (Math.PI / 2));
            if (right > left) {
               if (right > forward) { heading -= (Math.PI / 2); }
            }
            else if (left > forward) { heading += (Math.PI / 2); }
         }
         result.fromAxisAndAngle (dmz.consts.Up, heading);
      }
   }

   return result;
}

setThrottle = function (obj, info) {
   var throttle = 1
     ;

   if (obj) {
      if ((info.speed < NormalSpeed) && (MinSpeed > 0)) {
         throttle -= ((NormalSpeed - info.speed) / (NormalSpeed - MinSpeed)) * 0.4;
      }
      else if (info.speed > NormalSpeed) {
         throttle += ((info.speed - NormalSpeed) / (MaxSpeed - NormalSpeed)) * 0.6;
      }
      dmz.object.scalar (obj, throttleHandle, throttle);
   }
};

updateTimeSlice = function (time) {

   var state
     , info
     , pos
     , vel
     , ori
     , dir
     , origPos
     , passed
     , obj

     ;

   Object.keys(objs).forEach(function (key) {
      obj = parseInt(key);
      state = dmz.object.state (obj);
      info = objs[obj];

//      self.log.warn ("state:", state.contains (dmz.consts.EngineOn));
      if (state && state.contains (dmz.consts.EngineOn)) {

         pos = dmz.object.position (obj);
         vel = dmz.object.velocity (obj);
         ori = dmz.object.orientation (obj);

         if (!pos) { pos = dmz.vector.create(); }
         if (!vel) { vel = dmz.vector.create(); }
         if (!ori) { ori = dmz.matrix.create(); }

         ori = calculateOrientation (obj, info, pos, ori);
//         self.log.warn("ori:", ori);

         dir = ori.transform (dmz.consts.Forward);
//         self.log.warn ("dir", dir);

         setThrottle (obj, info);

         vel = dir.multiply(info.speed);
         origPos = pos;
         pos = pos.add (vel.multiply(time));

//         self.log.warn("vel:", vel, " origPos:", origPos, " pos:", pos);
         passed =
               ((info.speed > 0) ? dmz.consts.testMove (obj, origPos, pos, ori) : true);

         dmz.object.position (obj, null, (passed ? pos : origPos));
         dmz.object.velocity (obj, null, (passed ? vel : dmz.vector.create()));
         dmz.object.orientation (obj, null, ori);
      }
      else {
         dmz.object.velocity (obj, null, [0, 0, 0]);
      }
   });
};

dmz.object.create.observe (self, function (obj, Type) {
   if (Type.isOfType (dmz.consts.MCPType)) { MCP = obj; }
});

dmz.object.state.observe (self, function (obj, Attribute, State, PreviousState) {
   var info = objs[obj]
     , newState
     , FrameTime
     , cycleState
     , object
     , objInfo
     ;

//     self.log.warn ("state.observe:", info, obj, obj == MCP)
   if (!PreviousState) { PreviousState = dmz.consts.EmptyState; }
   if (info) {
      if (State.contains (dmz.consts.Standby) &&
          !PreviousState.contains (dmz.consts.Standby)) {

         if (info.pos && info.ori) {
            dmz.object.position (obj, null, info.pos);
            dmz.object.orientation (obj, null, info.ori);
            dmz.object.velocity (obj, null, [0, 0, 0]);
            info.speed = randomSpeed();
         }
      }
   }
   else if (obj == MCP) {
      newState = null;
      if (State.contains (dmz.consts.GameWaiting) &&
            !PreviousState.contains (dmz.consts.GameWaiting)) {
         newState = dmz.consts.Standby;
      }
      else if (State.contains (dmz.consts.GameActive) &&
            !PreviousState.contains (dmz.consts.GameActive)) {
         newState = dmz.consts.EngineOn;
      }
      if (newState) {
         FrameTime = dmz.time.getFrameTime ();
//         self.log.warn("objs:", objs, Object.keys(objs));
         Object.keys(objs).forEach(function (key) {
//            self.log.warn("loop:",key, objs[key]);
            object = parseInt (key);
            info = objs[object];
            info.lastTurnTime = FrameTime;
            info.nextTurnTime = nextTurn (FrameTime);
            if (info.startobj) {
               cycleState = dmz.object.state (object);
               if (!cycleState) { cycleState = dmz.mask.create(); }
               cycleState = cycleState.unset (dmz.consts.CycleState);
               cycleState = cycleState.or(newState);
//               self.log.warn("setting state:",cycleState);
               dmz.object.state (object, null, cycleState);
            }
//            else { self.log.warn ("no info.startobj", key); }
         });
      }
//      else { self.log.warn ("!newstate", State); }
   }
});

dmz.object.link.observe (self, dmz.consts.StartLinkHandle,
function (Link, Attribute, Super, Sub) {

   var SuperType = dmz.object.type (Super)
     , info = objs[Sub]
     , cycleState
     ;

//   self.log.warn ("link");

   if (SuperType && info) {
      if (SuperType.isOfType (dmz.consts.StartPointType)) {
         info.startobj = Super;
         info.pos = dmz.object.position (Super);
         info.ori = dmz.object.orientation (Super);

         cycleState = dmz.object.state (Sub);
         if (!cycleState) { cycleState = dmz.mask.create(); }
         cycleState = cycleState.unset (dmz.consts.CycleState);
         cycleState = cycleState.or(dmz.consts.Standby);
         dmz.object.state (Sub, null, cycleState);
      }
   }
});

dmz.object.unlink.observe (self, dmz.consts.StartLinkHandle,
function (Link, Attribute, Super, Sub) {

   var info = objs[Sub]
     , cycleState
     ;

//   self.log.warn ("unlink");

   if (info && info.startobj == Super) {
      cycleState = dmz.object.state (Sub)
      if (!cycleState) { cycleState = dmz.mask.create(); }
      cycleState = cycleState.unset (dmz.consts.CycleState);
      cycleState = cycleState.or(dmz.consts.Dead);
      dmz.object.state (Sub, null, cycleState);
      info.startobj = null;
      info.pos = null;
      info.ori = null;
   }
});

timeSlice = dmz.time.setRepeatingTimer(self, updateTimeSlice);
