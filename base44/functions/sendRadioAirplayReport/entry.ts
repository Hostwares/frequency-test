import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access (scheduled task)
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all artists
    const allArtists = await base44.entities.ArtistProfile.list();
    
    let reportsSent = 0;
    const currentDate = new Date();

    for (const artist of allArtists) {
      try {
        // Get artist's user account
        const artistUsers = await base44.entities.User.filter({ id: artist.user_id });
        if (!artistUsers || artistUsers.length === 0) continue;
        
        const artistUser = artistUsers[0];
        
        // Get radio activity for this artist
        const radioDownloads = await base44.entities.RadioDownload.filter({ 
          artist_profile_id: artist.id 
        });
        
        const airplayReports = await base44.entities.AirplayReport.filter({ 
          artist_profile_id: artist.id 
        });

        // Get unique stations
        const uniqueStations = [...new Set([
          ...radioDownloads.map(d => d.station_name),
          ...airplayReports.map(r => r.station_name)
        ].filter(Boolean))];

        // Calculate metrics
        const totalDownloads = radioDownloads.length;
        const totalAdds = airplayReports.filter(r => r.report_type === 'add').length;
        const totalSpins = airplayReports.reduce((sum, r) => sum + (r.spin_count || 0), 0);
        
        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentActivity = [
          ...radioDownloads.filter(d => new Date(d.created_date) > thirtyDaysAgo),
          ...airplayReports.filter(r => new Date(r.created_date) > thirtyDaysAgo)
        ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10);

        // Build email content
        const emailSubject = `📻 Your Radio Airplay Report - ${uniqueStations.length} Stations`;
        
        const emailBody = `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1025 0%, #0f172a 100%); padding: 40px 20px;">
            <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #06b6d4; font-size: 28px; margin: 0 0 10px 0;">📻 Radio Airplay Report</h1>
                <p style="color: #718096; font-size: 14px; margin: 0;">${currentDate.toLocaleDateString()}</p>
              </div>

              <!-- Artist Name -->
              <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); border-radius: 8px;">
                <h2 style="color: white; font-size: 24px; margin: 0;">${artist.artist_name}</h2>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 10px 0 0 0;">Radio Activity Summary</p>
              </div>

              <!-- Key Metrics -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                <div style="background: #f7fafc; padding: 20px; border-radius: 8px; text-align: center;">
                  <p style="color: #718096; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Stations Reached</p>
                  <p style="color: #2d3748; font-size: 32px; font-weight: bold; margin: 0;">${uniqueStations.length}</p>
                </div>
                <div style="background: #f7fafc; padding: 20px; border-radius: 8px; text-align: center;">
                  <p style="color: #718096; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Total Adds</p>
                  <p style="color: #2d3748; font-size: 32px; font-weight: bold; margin: 0;">${totalAdds}</p>
                </div>
                <div style="background: #f7fafc; padding: 20px; border-radius: 8px; text-align: center;">
                  <p style="color: #718096; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Downloads</p>
                  <p style="color: #2d3748; font-size: 32px; font-weight: bold; margin: 0;">${totalDownloads}</p>
                </div>
                <div style="background: #f7fafc; padding: 20px; border-radius: 8px; text-align: center;">
                  <p style="color: #718096; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Total Spins</p>
                  <p style="color: #2d3748; font-size: 32px; font-weight: bold; margin: 0;">${totalSpins}</p>
                </div>
              </div>

              <!-- Station List -->
              ${uniqueStations.length > 0 ? `
                <div style="margin-bottom: 30px;">
                  <h3 style="color: #2d3748; font-size: 16px; margin: 0 0 15px 0;">📻 Stations Supporting You</h3>
                  <div style="space-y: 10px;">
                    ${uniqueStations.slice(0, 10).map(station => `
                      <div style="background: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #06b6d4;">
                        <p style="color: #2d3748; font-weight: 600; margin: 0; font-size: 14px;">${station}</p>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Recent Activity -->
              ${recentActivity.length > 0 ? `
                <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 25px; border-radius: 8px; margin-bottom: 30px; color: white;">
                  <h3 style="margin: 0 0 15px 0; font-size: 18px;">🎯 Recent Radio Activity</h3>
                  ${recentActivity.slice(0, 5).map(activity => `
                    <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                      <p style="font-weight: bold; margin: 0 0 5px 0; font-size: 14px;">${activity.station_name || 'Radio Station'}</p>
                      <p style="font-size: 12px; margin: 0; opacity: 0.9;">
                        ${activity.report_type ? `📊 ${activity.report_type.replace(/_/g, ' ')}` : `💾 ${activity.activity_type.replace(/_/g, ' ')}`}
                      </p>
                      <p style="font-size: 11px; margin: 5px 0 0 0; opacity: 0.8;">
                        ${new Date(activity.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <!-- Impact Summary -->
              <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
                <h3 style="color: #166534; font-size: 16px; margin: 0 0 10px 0;">📊 Radio Impact Summary</h3>
                <ul style="color: #15803d; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Reached ${uniqueStations.length} radio station${uniqueStations.length !== 1 ? 's' : ''}</li>
                  ${totalAdds > 0 ? `<li>${totalAdds} station${totalAdds !== 1 ? 's' : ''} added your music to rotation</li>` : ''}
                  ${totalSpins > 0 ? `<li>${totalSpins} total spin${totalSpins !== 1 ? 's' : ''} reported</li>` : ''}
                  ${totalDownloads > 0 ? `<li>${totalDownloads} download${totalDownloads !== 1 ? 's' : ''} by radio programmers</li>` : ''}
                </ul>
              </div>

              <!-- Footer -->
              <div style="text-align: center; padding-top: 20px; border-top: 2px solid #e2e8f0; margin-top: 30px;">
                <p style="color: #718096; font-size: 13px; margin: 0 0 10px 0;">
                  🎵 Keep building your radio presence!
                </p>
                <p style="color: #a0aec0; font-size: 11px; margin: 0;">
                  © 2026 Frequency. All rights reserved.
                </p>
              </div>

            </div>
          </div>
        `;

        // Send email
        await base44.integrations.Core.SendEmail({
          to: artistUser.email,
          subject: emailSubject,
          body: emailBody,
          from_name: 'Frequency',
        });

        reportsSent++;
        
      } catch (artistError) {
        console.error(`Failed to send radio report to artist ${artist.artist_name}:`, artistError);
      }
    }

    return Response.json({
      success: true,
      message: `Sent ${reportsSent} radio airplay reports`,
      reportsSent,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});