import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = '6a36ebebc184d2dd233f7fb3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { council_id, title, description, date, duration_minutes = 60, meeting_link } = payload;

    if (!council_id || !title || !date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the council
    const council = await base44.asServiceRole.entities.FanCouncil.get(council_id);
    if (!council) {
      return Response.json({ error: 'Council not found' }, { status: 404 });
    }

    // Get Google Calendar connection
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    // Calculate end time
    const startDateTime = new Date(date);
    const endDateTime = new Date(startDateTime.getTime() + duration_minutes * 60 * 1000);

    // Create Google Calendar event
    const calendarEvent = {
      summary: title,
      description: description || `Fan Council Meeting for ${council.name}`,
      location: meeting_link || (council.is_virtual ? 'Virtual Meeting' : ''),
      start: { dateTime: startDateTime.toISOString(), timeZone: 'UTC' },
      end: { dateTime: endDateTime.toISOString(), timeZone: 'UTC' },
      attendees: council.member_fan_ids?.map(fanId => ({ email: `fan-${fanId}@frequency.app` })) || [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 }, // 24 hours before
          { method: 'popup', minutes: 60 },    // 1 hour before
        ],
      },
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

    // Add meeting to council's scheduled_meetings array
    const meeting = {
      id: crypto.randomUUID(),
      title,
      description: description || `Fan Council Meeting for ${council.name}`,
      date,
      duration_minutes,
      is_virtual: !!meeting_link,
      meeting_link,
      calendar_event_id: created.id,
      reminders_sent: false,
      created_date: new Date().toISOString(),
    };

    const updatedMeetings = [...(council.scheduled_meetings || []), meeting];
    await base44.asServiceRole.entities.FanCouncil.update(council_id, {
      scheduled_meetings: updatedMeetings,
    });

    return Response.json({
      success: true,
      meeting,
      calendarEventId: created.id,
      htmlLink: created.htmlLink,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});