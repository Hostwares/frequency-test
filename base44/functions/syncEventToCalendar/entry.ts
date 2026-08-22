import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = '6a36ebebc184d2dd233f7fb3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event } = await req.json();
    if (!event) return Response.json({ error: 'Missing event data' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    const startDateTime = new Date(event.date).toISOString();
    // Default 2-hour duration if not specified
    const endDateTime = new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000).toISOString();

    const calendarEvent = {
      summary: event.title,
      description: event.description || '',
      location: event.is_virtual ? 'Virtual Event' : (event.location || ''),
      start: { dateTime: startDateTime, timeZone: 'UTC' },
      end: { dateTime: endDateTime, timeZone: 'UTC' },
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
    return Response.json({ success: true, calendarEventId: created.id, htmlLink: created.htmlLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});