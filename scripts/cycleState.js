, const = require("const")

create_obj (obj, Type)
   if (Type.is_of_type (dmz.const.MCPType)) { self.mcp = obj }
}

destroy_obj (obj)

}

update_obj_state (obj, Attribute, State, PreviousState)
   var hil = dmz.object.hil ()
   if (hil && obj == self.mcp && self.active) {
      if (!PreviousState) { PreviousState = dmz.const.EmptyState }
      if (State.contains (dmz.const.GameWaiting) and
            !PreviousState.contains (dmz.const.GameWaiting)) {
         var cycleState = dmz.object.state (hil)
         if (cycleState) {
            if (!cycleState.contains (dmz.const.Dead)) {
               dmz.object.add_to_counter (hil, dmz.const.WinsHandle)
            }
            cycleState.unset (dmz.const.Dead + dmz.const.EngineOn)
            cycleState = cycleState + dmz.const.Standby
         else {cycleState = dmz.const.Standby
         }
         dmz.object.state (hil, nil, cycleState)
         if (self.startPos) { dmz.object.position (hil, nil, self.startPos) }
         if (self.startOri) { dmz.object.orientation (hil, nil, self.startOri) }
         dmz.object.velocity (hil, nil, {0, 0, 0})
      else if (State.contains (dmz.const.GameActive) and
            !PreviousState.contains (dmz.const.GameActive)) {
         var cycleState = dmz.object.state (hil)
         if (cycleState) {
            cycleState.unset (dmz.const.Dead + dmz.const.Standby)
            cycleState = cycleState + dmz.const.EngineOn
         else {cycleState = dmz.const.EngineOn
         }
         dmz.object.state (hil, nil, cycleState)        
      }
   }
}

link_objs (Link, Attribute, Super, Sub)
   var SuperType = dmz.object.type (Super)
   var hil = dmz.object.hil ()
   if (SuperType && Sub == hil) {
      if (SuperType.is_of_type (dmz.const.StartPointType)) {
         self.active = true
         self.startPos = dmz.object.position (Super)
         self.startOri = dmz.object.orientation (Super)
         if (self.mcp) {
            var mcpState = dmz.object.state (self.mcp)
            if (mcpState) { update_obj_state (self.mcp, nil, mcpState) }
         }
      else if (SuperType.is_of_type (dmz.const.WaitPointType)) {
         self.active = false
         var cycleState = dmz.object.state (hil)
         if (cycleState) {
            cycleState.unset (dmz.const.CycleState)
            cycleState = cycleState + dmz.const.Standby
            dmz.object.state (hil , nil, cycleState)
            var pos = dmz.object.position (Super)
            if (pos) { dmz.object.position (hil, nil, pos) }
         }
      }
   }
}

close_event (EventHandle)
   var hil = dmz.object.hil ()
   if (hil) {
      var Target = dmz.event.obj_handle (EventHandle, dmz.event.TargetHandle)
      var Source = dmz.event.obj_handle (EventHandle, dmz.event.SourceHandle)
      if (hil == Source) { dmz.object.add_to_counter (hil, dmz.const.DeathsHandle)
      else if (hil == Target) { dmz.object.add_to_counter (hil, dmz.const.KillsHandle)
      }
   }
}

start ()
   var callbacks = {
      create_obj = create_obj,
      destroy_obj = destroy_obj,
      update_obj_state = update_obj_state,
   }
   self.objObs.register (nil, callbacks, self)
   callbacks = { link_objs = link_objs, }
   self.objObs.register (dmz.const.StartLinkHandle, callbacks, self)
   callbacks = { close_event = close_event, }
   self.eventObs.register ("Event_Collision", callbacks, self)
   var hil = dmz.object.hil ()
   if (hil) { dmz.object.state (hil, nil, dmz.const.Dead) }
}

stop ()
}

function new (config, name)
   var self = {
      start_plugin = start,
      stop_plugin = stop,
      log = dmz.log.new ("lua." + name),
      objObs = dmz.object_observer.new (),
      eventObs = dmz.event_observer.new (),
      config = config,
      name = name,
   }

   self.log.info ("Creating plugin. " + name)
   
   return self
}

