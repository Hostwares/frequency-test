import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = '6a36ebebc184d2dd233f7fb3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify this is being called by the system
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data, old_data } = await req.json();
    
    // Only trigger on update events
    if (event.type !== 'update') {
      return Response.json({ message: 'Only update events are processed' });
    }

    // Check if radio_status changed to an active rotation status
    const activeRotationStatuses = ['light_rotation', 'medium_rotation', 'heavy_rotation', 'featured'];
    const oldStatus = old_data?.radio_status;
    const newStatus = data?.radio_status;
    
    // Only sync if status changed TO an active rotation status (not FROM one)
    if (!newStatus || !activeRotationStatuses.includes(newStatus)) {
      return Response.json({ message: 'No active rotation status change detected' });
    }
    
    if (oldStatus && activeRotationStatuses.includes(oldStatus)) {
      return Response.json({ message: 'Status already in active rotation' });
    }

    // Get the radio programmer who made the update
    const radioProgrammerId = data.radio_programmer_id;
    if (!radioProgrammerId) {
      return Response.json({ error: 'No radio programmer ID found' }, { status: 400 });
    }

    const programmer = await base44.entities.RadioProgrammer.get(radioProgrammerId);
    if (!programmer) {
      return Response.json({ error: 'Radio programmer not found' }, { status: 404 });
    }

    // Get Google Calendar access token
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    // Create calendar event for the rotation
    const eventDate = new Date();
    const startDateTime = eventDate.toISOString();
    // Default 1-hour duration for rotation tracking
    const endDateTime = new Date(eventDate.getTime() + 60 * 60 * 1000).toISOString();

    const calendarEvent = {
      summary: `🎵 ${data.artist_name} - ${data.song_title || 'New Track'} Added to Rotation`,
      description: `Station: ${programmer.station_name}
Programmer: ${programmer.role.replace(/_/g, ' ')}
Rotation Status: ${newStatus.replace(/_/g, ' ')}
Artist: ${data.artist_name}
Track: ${data.song_title || 'TBD'}
Song ID: ${data.song_id || 'Pending'}

This track has been added to ${newStatus.replace(/_/g, ' ')} rotation.`,
      location: programmer.location || `${programmer.station_name} - ${programmer.station_type.replace(/_/g, ' ')}`,
      start: { dateTime: startDateTime, timeZone: 'UTC' },
      end: { dateTime: endDateTime, timeZone: 'UTC' },
      // Add custom properties for tracking
      extendedProperties: {
        private: {
          radioProgrammerId: programmer.id,
          artistProfileId: data.artist_profile_id,
          songId: data.song_id,
          rotationStatus: newStatus,
          radioDownloadId: data.id
        }
      }
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return Response.json({ error: err.error?.message || 'Google Calendar API error' }, { status: 500 });
    }

    const created = await response.json();
    
    // Optionally update the RadioDownload record with calendar event ID
    try {
      await base44.entities.RadioDownload.update(data.id, {
        calendar_event_id: created.id
      });
    } catch (updateError) {
      console.error('Failed to update RadioDownload with calendar event ID:', updateError);
    }

    return Response.json({ 
      success: true, 
      calendarEventId: created.id, 
      htmlLink: created.htmlLink,
      artist: data.artist_name,
      song: data.song_title,
      rotationStatus: newStatus
    });
    
  } catch (error) {
    console.error('Error in syncRadioRotationToCalendar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});