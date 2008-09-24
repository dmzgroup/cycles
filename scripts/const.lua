local dmz = dmz

module (...)

GameWaiting = dmz.definitions.lookup_state ("Game_Waiting")
GameCountdown5 = dmz.definitions.lookup_state ("Game_Countdown_5")
GameCountdown4 = dmz.definitions.lookup_state ("Game_Countdown_4")
GameCountdown3 = dmz.definitions.lookup_state ("Game_Countdown_3")
GameCountdown2 = dmz.definitions.lookup_state ("Game_Countdown_2")
GameCountdown1 = dmz.definitions.lookup_state ("Game_Countdown_1")
GameActive = dmz.definitions.lookup_state ("Game_Active")

GameStateMask =
   GameWaiting +
   GameActive +
   GameCountdown1 +
   GameCountdown2 +
   GameCountdown3 +
   GameCountdown4 +
   GameCountdown5

Dead = dmz.definitions.lookup_state ("Dead")
Standby = dmz.definitions.lookup_state ("Standby")
EngineOn = dmz.definitions.lookup_state ("Engine_On")
CycleState = Dead + Standby + EngineOn
EmptyState = dmz.mask.new ()

TimeStampHandle = dmz.handle.new ("MCP_Running_Time")
StartLinkHandle = dmz.handle.new ("Start_Position")

CycleType = dmz.object_type.new ("cycle")
MCPType = dmz.object_type.new ("mcp")
StartPointType = dmz.object_type.new ("start_point")
WaitPointType = dmz.object_type.new ("wait_point")
DroneType = dmz.object_type.new ("blue_drone")

Right = dmz.vector.right ()
Left = dmz.vector.left ()
Up = dmz.vector.up ()
Forward = dmz.vector.forward ()

function test_move (self, object, origPos, pos, ori)
   local result = true
   if object then
      dmz.isect.disable_isect (object)
      local deathPoint = nil
      local target = nil
      local left = ori:transform (Left * 0.6) + pos
      local right = ori:transform (Right * 0.6) + pos
      local wiskerResults = dmz.isect.do_isect (
         { type = dmz.isect.SegmentTest, start = right, vector = left, },
         { type = dmz.isect.ClosestPoint, })
      if wiskerResults and wiskerResults[1] then
         deathPoint = wiskerResults[1].point
         target = wiskerResults[1].object
         result = false
      else
         origPos = dmz.vector.new (origPos)
         origPos:set_y (origPos:get_y () + 0.5)
         origPos:set_z (origPos:get_z ())
         origPos = origPos
         pos = dmz.vector.new (pos)
         pos:set_y (pos:get_y () + 0.5)
         pos = pos
         local isectResults = dmz.isect.do_isect (
            { type = dmz.isect.SegmentTest, start = origPos, vector = pos, },
            { type = dmz.isect.ClosestPoint, })
         if isectResults and isectResults[1] then
            deathPoint = isectResults[1].point
            target = isectResults[1].object
            result = false
         end
      end
      if deathPoint then
         local state = dmz.object.state (object)
         if not state then state = dmz.mask.new () end
         state:unset (CycleState)
         state = state + Dead
         dmz.object.state (object, nil, state)
         dmz.object.velocity (object, nil, {0, 0, 0})
         local Event = dmz.event.open_collision (object, target)
         dmz.event.position (Event, nil, deathPoint)
         dmz.event.close (Event)
      end
      dmz.isect.enable_isect (object)
   end
   return result
end

