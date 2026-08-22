import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all artist profiles
    const artists = await base44.entities.ArtistProfile.filter({});
    
    let reportsSent = 0;

    for (const artist of artists) {
      try {
        // Get artist's user account
        const artistUsers = await base44.entities.User.filter({ id: artist.user_id });
        if (!artistUsers || artistUsers.length === 0) continue;
        
        const artistUser = artistUsers[0];
        const currentFans = artist.supporter_count || 0;

        // Calculate next milestone
        const milestones = [20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000];
        const nextMilestone = milestones.find(m => m > currentFans) || 100000;
        const previousMilestone = milestones.filter(m => m <= currentFans).pop() || 0;
        const fansNeeded = nextMilestone - currentFans;
        const milestoneProgress = ((currentFans - previousMilestone) / (nextMilestone - previousMilestone) * 100).toFixed(1);

        // Get top songs
        const songs = await base44.entities.Song.filter({ artist_profile_id: artist.id }, '-play_count', 5);

        const emailSubject = `🎯 Your Monthly Growth Report - ${fansNeeded.toLocaleString()} Fans to Go!`;
        
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1025 0%, #0f172a 100%); padding: 40px 20px;">
            <div style="background: white; padding: 30px; border-radius: 8px;">
              <h1 style="color: #667eea; margin-bottom: 20px;">🎯 Monthly Growth Report</h1>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; text-align: center;">
                  <p style="color: white; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Current Fans</p>
                  <p style="color: white; font-size: 32px; font-weight: bold; margin: 0;">${currentFans.toLocaleString()}</p>
                </div>
                <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 20px; border-radius: 8px; text-align: center;">
                  <p style="color: white; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Monthly Support</p>
                  <p style="color: white; font-size: 32px; font-weight: bold; margin: 0;">$${(artist.monthly_support_total || 0).toFixed(2)}</p>
                </div>
              </div>

              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 8px; margin-bottom: 25px; color: white;">
                <h3 style="margin: 0 0 15px 0; font-size: 18px;">🎯 Next Milestone: ${nextMilestone.toLocaleString()} Fans</h3>
                <div style="margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 14px;">Progress</span>
                    <span style="font-weight: bold;">${milestoneProgress}%</span>
                  </div>
                  <div style="background: rgba(255,255,255,0.3); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="background: white; height: 100%; width: ${milestoneProgress}%; border-radius: 4px;"></div>
                  </div>
                </div>
                <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
                  🚀 Only <strong>${fansNeeded.toLocaleString()}</strong> fans away!
                </p>
              </div>

              ${songs.length > 0 ? `
                <div style="margin-bottom: 25px;">
                  <h3 style="color: #2d3748; font-size: 16px; margin: 0 0 15px 0;">🎵 Top Songs</h3>
                  ${songs.map((song, index) => `
                    <div style="background: #f7fafc; padding: 12px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: #2d3748; font-weight: 600; font-size: 14px;">${index + 1}. ${song.title}</span>
                      <span style="color: #718096; font-size: 12px;">${song.play_count || 0} plays</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <div style="background: #fff5f5; border-left: 4px solid #fc8181; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
                <p style="color: #742a2a; font-size: 14px; line-height: 1.6; margin: 0;">
                  💝 <strong>Tip:</strong> When you reach ${nextMilestone.toLocaleString()} fans, send a gratitude payment to your Discovery Partner!
                </p>
              </div>

              <div style="text-align: center; padding-top: 20px; border-top: 2px solid #e2e8f0;">
                <p style="color: #718096; font-size: 12px; margin: 0;">Keep creating! 🎵 | © 2026 Frequency</p>
              </div>
            </div>
          </div>
        `;

        await base44.integrations.Core.SendEmail({
          to: artistUser.email,
          subject: emailSubject,
          body: emailBody,
          from_name: 'Frequency',
        });

        reportsSent++;
      } catch (artistError) {
        console.error(`Failed to send report to artist ${artist.artist_name}:`, artistError);
      }
    }

    return Response.json({
      success: true,
      message: `Sent ${reportsSent} monthly growth reports`,
      reportsSent,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});