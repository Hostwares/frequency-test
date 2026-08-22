import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: programmerProfile } = await base44.asServiceRole.entities.RadioProgrammer.filter({ user_id: user.id });
    if (!programmerProfile || programmerProfile.length === 0) {
      return Response.json({ error: 'Radio programmer profile not found' }, { status: 404 });
    }

    const programmer = programmerProfile[0];
    
    // Get Google Sheets connection (APP_USER mode - each programmer connects their own account)
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection('6a370c6b76208ed68fd00612');

    // Fetch airplay reports for this programmer
    const { data: airplayReports } = await base44.asServiceRole.entities.AirplayReport.filter({ 
      radio_programmer_id: programmer.id 
    }, '-created_date', 500);

    if (!airplayReports || airplayReports.length === 0) {
      return Response.json({ error: 'No airplay reports found' }, { status: 404 });
    }

    // Create a new Google Sheet
    const createResponse = await fetch('https://sheets.googleapis.com/v1/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `Airplay Report - ${programmer.station_name} - ${new Date().toLocaleDateString()}`,
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.error?.message || 'Failed to create spreadsheet');
    }

    const spreadsheet = await createResponse.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // Prepare data for the sheet
    const headers = [
      'Date',
      'Artist',
      'Song Title',
      'Report Type',
      'Rotation Status',
      'Spin Count',
      'Show Name',
      'Station',
      'Notes'
    ];

    const rows = airplayReports.map(report => [
      new Date(report.created_date).toLocaleDateString(),
      report.artist_name || 'Unknown',
      report.song_title || 'Unknown',
      report.report_type.replace(/_/g, ' '),
      report.rotation_status?.replace(/_/g, ' ') || 'N/A',
      report.spin_count || 1,
      report.show_name || 'N/A',
      report.station_name || programmer.station_name,
      report.notes || ''
    ]);

    const values = [headers, ...rows];

    // Add data to the sheet
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:I${values.length + 1}:valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(error.error?.message || 'Failed to add data to spreadsheet');
    }

    // Format the header row
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                    textFormat: {
                      bold: true,
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                    },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
          ],
        }),
      }
    );

    return Response.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      message: `Successfully exported ${airplayReports.length} airplay reports to Google Sheets`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});