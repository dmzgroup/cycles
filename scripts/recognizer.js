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
      , mask: require("dmz/types/mask")
      }

   , TargetHandle = dmz.defs.createNamedHandle("Recognizer_Target_Counter")
   , LocalSpeed = 30
   , path =
         [ dmz.vector.create ([0.0, 1.0, 0.0])
         , dmz.vector.create ([0.0, 1.0, 1.0])
         , dmz.vector.create ([0.33333, 1.0, 1.0])
         , dmz.vector.create ([0.33333, 1.0, 0.0])
         , dmz.vector.create ([0.66667, 1.0, 0.0])
         , dmz.vector.create ([0.66667, 1.0, 1.0])
         , dmz.vector.create ([1.0, 1.0, 1.0])
         , dmz.vector.create ([1.0, 1.0, 0.0])
         , dmz.vector.create ([0.66667, 1.0, 0.0])
         , dmz.vector.create ([0.66667, 1.0, 1.0])
         , dmz.vector.create ([0.33333, 1.0, 1.0])
         , dmz.vector.create ([0.33333, 1.0, 0.0])
         ]

   , rotate
   , newOri
   , updateTimeSlice
   , timeSlice
   , Objs = {}

   ;

rotate = function (time, orig, target) {
   var diff = target - orig
     , max
     ;
   if (diff > Math.Pi) { diff -= Math.PI * 2; }
   else if (diff < -Math.Pi) { diff += Math.PI * 2; }
   max = time * Math.Pi * 3;
   if (Math.abs (diff) > max) {
      if (diff > 0) { target = orig + max; }
      else { target = orig - max; }
   }
   return target;
};

newOri = function (obj, time, targetVec) {
   var result = dmz.matrix.create ()
     , hvec = dmz.vector.create (targetVec)
     , heading
     , hcross
     , ori
     , dir
     , currentHeading
     , cross
     ;

   hvec.add([0, -hvec.toArray()[1], 0]);
   hvec = hvec.normalize ();
   heading = dmz.consts.Forward.getAngle (hvec);
   hcross = dmz.consts.Forward.cross (hvec).normalize ().toArray();
   if (hcross[1] < 0.0) {
      heading = (Math.PI * 2) - heading;
   }
   if (heading > Math.PI) { heading -= Math.PI * 2; }
   else if (heading < -Math.PI) { heading += Math.PI * 2; }

   ori = dmz.object.orientation (obj);
   if (!ori) { ori = dmz.matrix.create (); }
   dir = ori.transform (dmz.consts.Forward);
   dir.add([0, -dir.toArray()[1], 0]);
   currentHeading = dmz.consts.Forward.getAngle (dir);
   cross = dmz.consts.Forward.cross (dir).toArray();
   if (cross[1] < 0) { currentHeading = (Math.PI * 2) - currentHeading; }
   heading = rotate (time, currentHeading, heading);
   result = result.fromAxisAndAngle (dmz.consts.Up, heading);
   return result;
};

updateTimeSlice = function (time) {
   var pos
     , which
     , target
     , max
     , offset
     , distance
     , delta
     , obj
     ;

   Object.keys(Objs).forEach (function (key) {
      obj = parseInt(key);
      pos = dmz.object.position(obj);
      if (!pos) { pos = dmz.vector.create () }

      which = dmz.object.counter (obj, TargetHandle);
      target = path[which];
      if (!target) { self.log.warn (which, path[which], path.length); }

      max = time * LocalSpeed;
      offset = target.subtract(pos);
      distance = offset.magnitude ();
      delta = distance;
      if (delta > max) { delta = max; }
      offset = offset.normalize ();
      pos = pos.add(offset.multiply(delta));
      if (dmz.util.isZero (distance)) {
         which += 1;
         if (which >= path.length) { which = 0; }
         dmz.object.counter (obj, TargetHandle, which);
      }
      dmz.object.position (obj, null, pos);
      dmz.object.orientation (obj, null, newOri (obj, time, offset));
      dmz.object.velocity (obj, null, offset.multiply(LocalSpeed));
   });
};

dmz.object.destroy.observe (self, function (obj) {
   if (Objs[obj]) { delete Objs[obj]; }
});

dmz.object.flag.observe (self, dmz.defs.createNamedHandle("Recognizer_Controlled"),
function (obj, attr, value) {
   var pos = dmz.object.position (obj)
     , target = 0
     , offset = Infinity
     , distance
     , count = 0
     , index
     ;

   Objs[obj] = obj;
   if (!pos) { pos = dmz.vector.create (); }
   for (count = 0; count < path.length; count += 1) {
      distance = (path[count].subtract(pos)).magnitude ();
      if (offset > distance) {
         offset = distance;
         target = index;
      }
   }
   dmz.object.counter (obj, TargetHandle, target);
});

(function () {
   var min = self.config.number ("min", -250)
     , max = self.config.number ("max", 250)
     , offset = max - min
     , height = self.config.number ("height", 35)
     , index = 0
     , value
     ;

   for (index = 0; index < path.length; index += 1) {
      value = path[index].toArray();
      path[index] = dmz.vector.create (
            (value[0] * offset) + min,
            value[1] * height,
            (value[2] * offset) + min);
   }
}());

timeSlice = dmz.time.setRepeatingTimer(self, updateTimeSlice);
