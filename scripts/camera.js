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

   , timeSlice
   , timeSliceFunction
   , Active = 0
   , Offset = self.config.vector("offset", dmz.vector.create(0,3,8))
   , Heading = 0
   , throttleHandle = dmz.defs.createNamedHandle(
        self.config.string("throttle.name", "throttle"))
   , watch
   , sideMod
   , backMod

   ;

timeSliceFunction = function (time) {

   var hil = dmz.object.hil()
     , state
     , pos
     , ori
     , dir
     , heading
     , prevOri
     , prevDir
     , headingDiff
     , MaxTurn

     ;

   if (hil && Active > 0) {

      state = dmz.object.state(hil);

      if (state && state.contains(dmz.consts.Dead)) {
         if (watch) {
            pos = dmz.vector.create(300, 50, 300);
            ori = dmz.vector.Forward.cross(-1, 0, -1).normalize();
            ori = dmz.matrix.create().fromAxisAndAngle(
               ori,
               ori.getAngle(dmz.vector.Forward));

            dmz.portal.view(pos, ori);
         }
      }
      else {
         watch = false;
         MaxTurn = (Math.PI * 2 * time);
         pos = dmz.object.position(hil);
         ori = dmz.object.orientation(hil);
         dir = dmz.object.velocity(hil);

         if (!pos) { pos = dmz.vector.create(); }
         if (!ori) { ori = dmz.matrix.create(); }
         if (!dir || dir.isZero()) { dir = ori.transform(dmz.vector.Forward); }
         else { dir = dir.normalize(); }
         heading = Heading;
         var prevOri = dmz.matrix.create().fromAxisAndAngle(dmz.vector.Up, Heading);
         var prevDir = prevOri.transform(dmz.vector.Forward);
         var headingDiff = prevDir.getAngle(dir);
         if (headingDiff > MaxTurn) { headingDiff = MaxTurn; }
         if (prevDir.cross(dir).y < 0) { heading = heading - headingDiff; }
         else { heading += headingDiff; }
         Heading = heading;
         if (backMod) { heading += backMod; }
         else if (sideMod) { heading += sideMod; }

         ori = dmz.matrix.create().fromAxisAndAngle(dmz.vector.Up, heading);
         pos = ori.transform(Offset).add(pos);
         dmz.portal.view(pos, ori);
      }
   }
};

//Active = 1;
//timeSlice = dmz.time.setRepeatingTimer (self, timeSliceFunction);
dmz.input.channel.observe (self, function (channel, state) {
   var hil;

   if (state) {  Active += 1; }
   else { Active -= 1; }

   if (Active === 1) {
      timeSlice = dmz.time.setRepeatingTimer(self, timeSliceFunction);
   }
   else if (Active === 0) {
      dmz.time.cancleTimer(timeSlice);
      hil = dmz.object.hil()
      if (hil) { dmz.object.scalar(hil, throttleHandle, 0); }
   }
});

dmz.input.axis.observe (self, function (channel, axis) {
   var value = 0
     ;
   if (dmz.util.isNotZero(axis.value)) {
      if (axis.value > 0) { value = 1; }
      else { value = -1; }
   }
   switch (axis.id) {
   case 1: break;
   case 2: backMod = (value > 0) ? Math.PI : null; break;
   case 6: sideMod = (value) ? Math.PI / 2 * (value / Math.abs(value)) : null; break;
   case 7: break;
   }
});

dmz.input.button.observe (self, function (channel, button) {
   if (button.id === 1 && button.value) { watch = true; }
});
