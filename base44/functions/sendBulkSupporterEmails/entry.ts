import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authenticated user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipient_emails, subject, message } = await req.json();

    if (!recipient_emails || !Array.isArray(recipient_emails) || recipient_emails.length === 0) {
      return Response.json({ error: 'No recipients provided' }, { status: 400 });
    }

    if (!subject || !message) {
      return Response.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    // Get Gmail access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Send emails individually
    const sendPromises = recipient_emails.map(async (email) => {
      const rawMessage = btoa(
        `From: ${user.full_name}\r\n` +
        `To: ${email}\r\n` +
        `Subject: ${subject}\r\n` +
        `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
        message
      );

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: rawMessage }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    });

    const results = await Promise.allSettled(sendPromises);
    
    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return Response.json({ 
      success: true,
      sent,
      failed,
      total: recipient_emails.length,
    });
  } catch (error) {
    console.error('Error sending bulk emails:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});