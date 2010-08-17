var dmz =
      { object : require("dmz/components/object")
      , event: require("dmz/components/event")
      , time: require("dmz/runtime/time")
      , consts: require("const")
      , input: require("dmz/components/input")
      , portal: require("dmz/components/portal")
      , vector: require("dmz/types/vector")
      , defs: require("dmz/runtime/definitions")
      , matrix: require("dmz/types/matrix")
      , util: require("dmz/types/util")
      , eventType: require("dmz/runtime/eventType")
      }

   , MCP
   , Active = false
   , StartPos
   , StartOri

   , updateObjectState

   ;

(function () {
   var hil = dmz.object.hil ();
   if (hil) {
      dmz.object.state (hil, null, dmz.consts.Dead);
   }
}());

dmz.object.create.observe (self, function (obj, Type) {
   if (Type.isOfType (dmz.consts.MCPType)) { MCP = obj; }
});

updateObjectState = function (obj, Attribute, State, PreviousState) {
   var hil = dmz.object.hil ()
     , cycleState
     ;

   if (hil && (obj == MCP) && Active) {
      if (!PreviousState) { PreviousState = dmz.consts.EmptyState; }
      if (State.contains (dmz.consts.GameWaiting) &&
            !PreviousState.contains (dmz.consts.GameWaiting)) {

         cycleState = dmz.object.state (hil);
         if (cycleState) {

            if (!cycleState.contains (dmz.consts.Dead)) {
               dmz.object.addToCounter (hil, dmz.consts.WinsHandle)
            }
            cycleState = cycleState.unset (dmz.consts.Dead.or(dmz.consts.EngineOn));
            cycleState = cycleState.or(dmz.consts.Standby);
         }
         else { cycleState = dmz.consts.Standby; }
         dmz.object.state (hil, null, cycleState);
         if (StartPos) { dmz.object.position (hil, null, StartPos); }
         if (StartOri) { dmz.object.orientation (hil, null, StartOri); }
         dmz.object.velocity (hil, null, [0, 0, 0]);
      }
      else if (State.contains (dmz.consts.GameActive) &&
            !PreviousState.contains (dmz.consts.GameActive)) {

         cycleState = dmz.object.state (hil);
         if (cycleState) {
            cycleState = cycleState.unset (dmz.consts.Dead.or(dmz.consts.Standby));
            cycleState = cycleState.or(dmz.consts.EngineOn);
         }
         else { cycleState = dmz.consts.EngineOn; }
         dmz.object.state (hil, null, cycleState);
      }
   }
};

dmz.object.state.observe (self, updateObjectState);

dmz.object.link.observe (self, dmz.consts.StartLinkHandle,
function (Link, Attribute, Super, Sub) {
   var SuperType = dmz.object.type (Super)
     , hil = dmz.object.hil ()
     , mcpState
     , cycleState
     , pos
     ;
   if (SuperType && Sub == hil) {
      if (SuperType.isOfType (dmz.consts.StartPointType)) {
         Active = true;
         StartPos = dmz.object.position (Super);
         StartOri = dmz.object.orientation (Super);
         if (MCP) {
            mcpState = dmz.object.state (MCP);
            if (mcpState) { updateObjectState (MCP, null, mcpState); }
         }
      }
      else if (SuperType.isOfType (dmz.consts.WaitPointType)) {
         Active = false;
         cycleState = dmz.object.state (hil);
         if (cycleState) {
            cycleState = cycleState.unset (dmz.consts.CycleState);
            cycleState = cycleState.or(dmz.consts.Standby);
            dmz.object.state (hil , null, cycleState);
            pos = dmz.object.position (Super);
            if (pos) { dmz.object.position (hil, null, pos); }
         }
      }
   }
});

dmz.event.close.observe (self, dmz.eventType.lookup("Event_Collision"),
function (EventHandle) {
   var hil = dmz.object.hil ()
     , Target
     , Source
     ;

   if (hil) {
      Target = dmz.event.handle (EventHandle, dmz.event.TargetHandle);
      Source = dmz.event.handle (EventHandle, dmz.event.SourceHandle);
      if (hil == Source) { dmz.object.addToCounter (hil, dmz.consts.DeathsHandle); }
      else if (hil == Target) { dmz.object.addToCounter (hil, dmz.consts.KillsHandle); }
   }
});
