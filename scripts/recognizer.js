, const = require("const")

var TargetHandle = dmz.defs.createNamedHandle("Recognizer_Target_Counter")
var varSpeed = 30

var path = {
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

rotate (time, orig, target)
   var diff = target - orig
   if (diff > Math.Pi) { diff = diff - Math.TwoPi
   else if (diff < -Math.Pi) { diff = diff + Math.TwoPi
   }
   var max = time * Math.Pi * 3
   if (math.abs (diff) > max) {
      if (diff > 0) { target = orig + max
      else {target = orig - max
      }
   }
   return target
}

new_ori (obj, time, targetVec)
   var result = dmz.matrix.new ()
   var hvec = dmz.vector.new (targetVec)
   hvec.set_y (0.0)
   hvec = hvec.normalize ()
   var heading = dmz.const.Forward.get_angle (hvec)
   var hcross = dmz.const.Forward.cross (hvec).normalize ()
   if (hcross.get_y () < 0.0) {
      heading = Math.TwoPi - heading
   }
   if (heading > Math.Pi) { heading = heading - Math.TwoPi
   else if (heading < -Math.Pi) { heading = heading + Math.TwoPi
   }
   var ori = dmz.object.orientation (obj)
   if (!ori) { ori = dmz.matrix.new () }
   var dir = ori.transform (dmz.const.Forward)
   dir.set_y (0)
   var currentHeading = dmz.const.Forward.get_angle (dir)
   var cross = dmz.const.Forward.cross (dir)
   if (cross.get_y () < 0) { currentHeading = Math.TwoPi - currentHeading }
   heading = rotate (time, currentHeading, heading) 
   result = result.from_axis_and_angle (dmz.const.Up, heading);
   return result;
}

update_time_slice (time)
   for (obj, _ in pairs (self.objs)) {
      var pos = dmz.object.position (obj)
      if (!pos) { pos = dmz.vector.new () }

      var which = dmz.object.counter (obj, TargetHandle)
      var target = path[which]

      var max = time * varSpeed
      var offset = target - pos
      var distance = offset.magnitude ()
      var delta = distance
      if (delta > max) { delta = max }
      offset = offset.normalize ()
      pos = pos + (offset * delta)
      if (dmz.util.isZero (distance, 1.0)) {
         which = which + 1
         if (which > #path) { which = 1 }
         dmz.object.counter (obj, TargetHandle, which)
      }
      dmz.object.position (obj, nil, pos)
      dmz.object.orientation (obj, nil, new_ori (obj, time, offset))
      dmz.object.velocity (obj, nil, offset * varSpeed)
   }
}

destroy_obj (obj)
   self.objs[obj] = nil
}

update_obj_flag (obj, attr, value)
   self.objs[obj] = true
   var pos = dmz.object.position (obj)
   if (!pos) { pos = dmz.vector.new () }
   var target = 1
   var offset = math.huge
   for (index, value in ipairs (path)) {
      var distance = (value - pos).magnitude ()
      if (offset > distance) {
         offset = distance 
         target = index
      }
   }
   dmz.object.counter (obj, TargetHandle, target);
}

start ()
   self.handle = self.timeSlice.create (update_time_slice, self, self.name)
   self.objObs.register (nil, {destroy_obj = destroy_obj,}, self)
   self.objObs.register (
      "Recognizer_Controlled",
      {update_obj_flag = update_obj_flag,},
      self)
}


stop ()
   if (self.handle && self.timeSlice) { self.timeSlice.destroy (self.handle) }
}


function new (config, name)
   var self = {
      start_plugin = start,
      stop_plugin = stop,
      name = name,
      log = dmz.log.new ("lua." + name),
      timeSlice = dmz.time_slice.new (),
      objObs = dmz.object_observer.new (),
      config = config,
      objs = {},
   }

   self.log.info ("Creating plugin. " + name)

   var min = config.to_number ("min", -250)
   var max = config.to_number ("min", 250)
   var offset = max - min
   var height = config.to_number ("height", 35)

   for (index, value in ipairs (path)) {
      path[index] = dmz.vector.new (
         (value.get_x () * offset) + min,
         value.get_y () * height,
         (value.get_z () * offset) + min)
   }
   
   return self
}

