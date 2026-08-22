import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = '6a36ebebc184d2dd233f7fb3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const councils = await base44.asServiceRole.entities.FanCouncil.filter({ is_active: true });
    
    let remindersSent = 0;

    for (const council of councils) {
      const meetings = council.scheduled_meetings || [];
      
      for (const meeting of meetings) {
        if (meeting.reminders_sent) continue;
        
        const meetingDate = new Date(meeting.date);
        
        // Send reminder if meeting is within the next hour
        if (meetingDate <= oneHourFromNow && meetingDate > now) {
          // Get Google Calendar connection to update the event
          try {
            const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
            
            // Update calendar event to mark reminder as sent
            if (meeting.calendar_event_id) {
              await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${meeting.calendar_event_id}`,
                {
                  method: 'PATCH',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    extendedProperties: {
                      private: { reminderSent: 'true' },
                    },
                  }),
                }
              );
            }
          } catch (err) {
            // Continue even if calendar update fails
            console.error('Failed to update calendar event:', err);
          }
          
          // Update council meeting to mark reminder as sent
          const updatedMeetings = meetings.map(m =>
            m.id === meeting.id ? { ...m, reminders_sent: true } : m
          );
          
          await base44.asServiceRole.entities.FanCouncil.update(council.id, {
            scheduled_meetings: updatedMeetings,
          });
          
          remindersSent++;
        }
      }
    }
    
    return Response.json({ success: true, remindersSent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});