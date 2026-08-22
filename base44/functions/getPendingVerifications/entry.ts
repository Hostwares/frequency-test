import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending verification requests
    const pendingRequests = await base44.entities.ArtistVerification.filter({ 
      status: 'pending' 
    }, '-submission_date');

    return Response.json({
      success: true,
      count: pendingRequests.length,
      requests: pendingRequests,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});