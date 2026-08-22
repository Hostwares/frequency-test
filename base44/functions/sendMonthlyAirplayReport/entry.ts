import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role for scheduled task
    const serviceBase44 = base44.asServiceRole;
    
    // Get all radio programmers
    const programmers = await serviceBase44.entities.RadioProgrammer.filter({ is_active: true });
    
    if (!programmers || programmers.length === 0) {
      return Response.json({ message: 'No active radio programmers found' });
    }

    // Calculate date range for last month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const startDate = lastMonth.toISOString();
    const endDate = endOfLastMonth.toISOString();

    let reportsSent = 0;

    for (const programmer of programmers) {
      try {
        // Get all airplay reports for this programmer from last month
        const airplayReports = await serviceBase44.entities.AirplayReport.filter({
          radio_programmer_id: programmer.id,
        });

        // Filter reports from last month
        const lastMonthReports = airplayReports.filter(report => {
          const reportDate = new Date(report.created_date);
          return reportDate >= lastMonth && reportDate <= endOfLastMonth;
        });

        // Get all radio downloads (rotation tracking) for this programmer
        const radioDownloads = await serviceBase44.entities.RadioDownload.filter({
          radio_programmer_id: programmer.id,
        });

        // Filter active rotation tracks
        const activeRotation = radioDownloads.filter(track => {
          const trackDate = new Date(track.created_date);
          return ['light_rotation', 'medium_rotation', 'heavy_rotation', 'featured'].includes(track.radio_status) &&
                 trackDate >= lastMonth && trackDate <= endOfLastMonth;
        });

        // Calculate statistics
        const totalSpins = lastMonthReports.reduce((sum, report) => sum + (report.spin_count || 0), 0);
        
        const rotationBreakdown = {
          light_rotation: activeRotation.filter(t => t.radio_status === 'light_rotation').length,
          medium_rotation: activeRotation.filter(t => t.radio_status === 'medium_rotation').length,
          heavy_rotation: activeRotation.filter(t => t.radio_status === 'heavy_rotation').length,
          featured: activeRotation.filter(t => t.radio_status === 'featured').length,
        };

        const totalActiveTracks = activeRotation.length;
        const totalArtists = new Set(activeRotation.map(t => t.artist_profile_id)).size;

        // Get user info for the programmer
        const user = await serviceBase44.entities.User.get(programmer.user_id);
        
        if (!user || !user.email) {
          console.log(`No email found for programmer ${programmer.id}`);
          continue;
        }

        // Generate HTML email
        const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Monthly Airplay Report - ${programmer.station_name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0f; color: #e0e0e0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #a855f7;">
      <h1 style="color: #a855f7; font-size: 28px; margin: 0 0 10px 0; font-weight: 700;">Monthly Airplay Report</h1>
      <p style="color: #888; font-size: 14px; margin: 0;">${programmer.station_name}</p>
      <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
    </div>

    <!-- Summary Stats -->
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 30px 0;">
      <div style="background: linear-gradient(145deg, rgba(168, 85, 247, 0.1), rgba(6, 182, 212, 0.05)); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
        <p style="color: #a855f7; font-size: 32px; font-weight: 700; margin: 0 0 5px 0;">${totalSpins}</p>
        <p style="color: #888; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Total Spins</p>
      </div>
      <div style="background: linear-gradient(145deg, rgba(6, 182, 212, 0.1), rgba(168, 85, 247, 0.05)); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
        <p style="color: #06b6d4; font-size: 32px; font-weight: 700; margin: 0 0 5px 0;">${totalActiveTracks}</p>
        <p style="color: #888; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Active Tracks</p>
      </div>
    </div>

    <!-- Rotation Breakdown -->
    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 25px; margin: 30px 0;">
      <h2 style="color: #e0e0e0; font-size: 18px; margin: 0 0 20px 0; font-weight: 600;">Rotation Status Breakdown</h2>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        <div style="background: rgba(6, 182, 212, 0.1); border-left: 3px solid #06b6d4; padding: 15px; border-radius: 8px;">
          <p style="color: #06b6d4; font-size: 24px; font-weight: 700; margin: 0 0 5px 0;">${rotationBreakdown.light_rotation}</p>
          <p style="color: #888; font-size: 11px; margin: 0; text-transform: uppercase;">Light Rotation</p>
        </div>
        <div style="background: rgba(168, 85, 247, 0.1); border-left: 3px solid #a855f7; padding: 15px; border-radius: 8px;">
          <p style="color: #a855f7; font-size: 24px; font-weight: 700; margin: 0 0 5px 0;">${rotationBreakdown.medium_rotation}</p>
          <p style="color: #888; font-size: 11px; margin: 0; text-transform: uppercase;">Medium Rotation</p>
        </div>
        <div style="background: rgba(217, 70, 239, 0.1); border-left: 3px solid #d946ef; padding: 15px; border-radius: 8px;">
          <p style="color: #d946ef; font-size: 24px; font-weight: 700; margin: 0 0 5px 0;">${rotationBreakdown.heavy_rotation}</p>
          <p style="color: #888; font-size: 11px; margin: 0; text-transform: uppercase;">Heavy Rotation</p>
        </div>
        <div style="background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; padding: 15px; border-radius: 8px;">
          <p style="color: #3b82f6; font-size: 24px; font-weight: 700; margin: 0 0 5px 0;">${rotationBreakdown.featured}</p>
          <p style="color: #888; font-size: 11px; margin: 0; text-transform: uppercase;">Featured</p>
        </div>
      </div>
    </div>

    <!-- Additional Stats -->
    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 25px; margin: 30px 0;">
      <h2 style="color: #e0e0e0; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">Monthly Overview</h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        <div style="padding: 10px;">
          <p style="color: #888; font-size: 12px; margin: 0 0 5px 0;">Unique Artists</p>
          <p style="color: #e0e0e0; font-size: 20px; font-weight: 600; margin: 0;">${totalArtists}</p>
        </div>
        <div style="padding: 10px;">
          <p style="color: #888; font-size: 12px; margin: 0 0 5px 0;">Total Reports</p>
          <p style="color: #e0e0e0; font-size: 20px; font-weight: 600; margin: 0;">${lastMonthReports.length}</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px 0; margin-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
      <p style="color: #666; font-size: 12px; margin: 0 0 10px 0;">Thank you for supporting independent music!</p>
      <p style="color: #555; font-size: 11px; margin: 0;">
        This is an automated report from Frequency. Access your full dashboard at 
        <a href="https://frequency.app" style="color: #a855f7; text-decoration: none;">frequency.app</a>
      </p>
      <p style="color: #444; font-size: 10px; margin: 10px 0 0 0;">
        © ${now.getFullYear()} Frequency. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
        `;

        // Send email using Gmail integration
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `📊 Monthly Airplay Report - ${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          body: emailBody,
          from_name: 'Frequency Radio',
        });

        reportsSent++;
        console.log(`Sent airplay report to ${programmer.station_name} (${user.email})`);
        
      } catch (programmerError) {
        console.error(`Error processing programmer ${programmer.id}:`, programmerError);
        // Continue with next programmer
      }
    }

    return Response.json({ 
      message: 'Monthly airplay reports processed',
      reportsSent,
      totalProgrammers: programmers.length,
      period: lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    });
    
  } catch (error) {
    console.error('Error in sendMonthlyAirplayReport:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});