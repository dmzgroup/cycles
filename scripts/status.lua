require "const"

local function close_event (self, EventHandle)
   local hil = dmz.object.hil ()
   if hil then
      if hil == dmz.event.object_handle (EventHandle, dmz.event.TargetHandle) then
         self.log:warn ("You have scored a KILL")
      elseif hil == dmz.event.object_handle (EventHandle, dmz.event.SourceHandle) then
         self.log:error ("You have been KILLED")
      end
   end
end

local function start (self)
   local callbacks = { close_event = close_event, }
   self.eventObs:register ("Event_Collision", callbacks, self)
end


local function stop (self)
end


function new (config, name)
   local self = {
      start_plugin = start,
      stop_plugin = stop,
      log = dmz.log.new ("lua." .. name),
      eventObs = dmz.event_observer.new (),
   }

   self.log:info ("Creating plugin: " .. name)
   
   return self
end

