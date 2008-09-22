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

