import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SHEET_SETTING_KEY = 'awards_tally_sheet_id';
const SHEET_URL_SETTING_KEY = 'awards_tally_sheet_url';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const year = body.year || new Date().getFullYear();

    console.log(`Syncing voting tallies to Google Sheets for ${year} cycle...`);

    // Get Google Sheets connection
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    // Fetch all categories, nominees, and votes for the cycle
    const categories = await base44.asServiceRole.entities.AwardsCategory.filter(
      { year, is_active: true }, 'sort_order', 200
    );
    const nominees = await base44.asServiceRole.entities.AwardsNominee.filter(
      { year }, '-votes_count', 1000
    );
    const votes = await base44.asServiceRole.entities.AwardsVote.filter(
      { voting_cycle: year }, '-voted_date', 5000
    );

    if (categories.length === 0) {
      return Response.json({ error: `No active award categories found for ${year}` }, { status: 404 });
    }

    // Build nominee lookup
    const nomineesByCategory = {};
    nominees.forEach(n => {
      if (!nomineesByCategory[n.category_id]) nomineesByCategory[n.category_id] = [];
      nomineesByCategory[n.category_id].push(n);
    });

    // Build vote tally
    const tallyByCategory = {};
    const rankedTallyByCategory = {};
    votes.forEach(v => {
      if (!tallyByCategory[v.category_id]) {
        tallyByCategory[v.category_id] = { tally: {}, total_votes: 0 };
      }
      tallyByCategory[v.category_id].total_votes++;
      const key = v.nominee_id || 'abstain';
      tallyByCategory[v.category_id].tally[key] = (tallyByCategory[v.category_id].tally[key] || 0) + 1;

      // Track ranked votes for final_voting phase
      if (v.voting_phase === 'final_voting' && v.vote_rank) {
        if (!rankedTallyByCategory[v.category_id]) {
          rankedTallyByCategory[v.category_id] = {};
        }
        if (!rankedTallyByCategory[v.category_id][v.nominee_id]) {
          rankedTallyByCategory[v.category_id][v.nominee_id] = { 1: 0, 2: 0, 3: 0 };
        }
        if (rankedTallyByCategory[v.category_id][v.nominee_id][v.vote_rank] !== undefined) {
          rankedTallyByCategory[v.category_id][v.nominee_id][v.vote_rank]++;
        }
      }
    });

    const headers = [
      'Category',
      'Category Type',
      'Voting Phase',
      'Nominee',
      'Nominee Type',
      'Nominee Status',
      'Total Votes',
      'Vote Percentage',
      '1st Choice Votes',
      '2nd Choice Votes',
      '3rd Choice Votes',
      'Rank',
      'Nomination Reason',
    ];

    const rows = [];
    categories.forEach(cat => {
      const catNominees = nomineesByCategory[cat.id] || [];
      const catTally = tallyByCategory[cat.id] || { tally: {}, total_votes: 0 };
      const catRanked = rankedTallyByCategory[cat.id] || {};
      const totalVotes = catTally.total_votes;

      const sorted = [...catNominees].sort((a, b) => {
        const aVotes = catTally.tally[a.id] || 0;
        const bVotes = catTally.tally[b.id] || 0;
        return bVotes - aVotes;
      });

      if (sorted.length === 0) {
        rows.push([
          cat.name,
          cat.category_type?.replace(/_/g, ' ') || '',
          cat.voting_phase?.replace(/_/g, ' ') || '',
          '(No nominees)', '', '', '0', '0%', '0', '0', '0', '', '',
        ]);
        return;
      }

      sorted.forEach((nominee, idx) => {
        const voteCount = catTally.tally[nominee.id] || 0;
        const pct = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(1) + '%' : '0%';
        const ranked = catRanked[nominee.id] || { 1: 0, 2: 0, 3: 0 };
        rows.push([
          cat.name,
          cat.category_type?.replace(/_/g, ' ') || '',
          cat.voting_phase?.replace(/_/g, ' ') || '',
          nominee.nominee_name,
          nominee.nominee_type?.replace(/_/g, ' ') || '',
          nominee.status?.replace(/_/g, ' ') || '',
          String(voteCount),
          pct,
          String(ranked[1] || 0),
          String(ranked[2] || 0),
          String(ranked[3] || 0),
          String(idx + 1),
          nominee.nomination_reason || '',
        ]);
      });
    });

    // Summary row at top
    const syncTime = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
    const summaryRow = [
      `Last Synced: ${syncTime} (CT)`,
      `Categories: ${categories.length}`,
      `Nominees: ${nominees.length}`,
      `Total Votes: ${votes.length}`,
      '', '', '', '', '', '', '', '', '',
    ];

    const values = [summaryRow, headers, ...rows];

    // Check for existing spreadsheet ID
    const existingSettings = await base44.asServiceRole.entities.PlatformSetting.filter(
      { setting_key: SHEET_SETTING_KEY }
    );
    const existingSheet = existingSettings[0];
    let spreadsheetId = existingSheet?.setting_value;

    if (spreadsheetId) {
      // Update existing spreadsheet — clear it first, then write fresh data
      const clearResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:Z10000:clear`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!clearResponse.ok) {
        console.error('Failed to clear existing sheet, creating new one instead');
        spreadsheetId = null;
      }
    }

    if (!spreadsheetId) {
      // Create a new spreadsheet
      const sheetTitle = `My Life Awards — Live Voting Tally — ${year}`;
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties: { title: sheetTitle } }),
      });

      if (!createResponse.ok) {
        const err = await createResponse.json();
        console.error('Failed to create spreadsheet:', JSON.stringify(err));
        return Response.json({ error: 'Failed to create Google Sheet' }, { status: 502 });
      }

      const spreadsheet = await createResponse.json();
      spreadsheetId = spreadsheet.spreadsheetId;

      // Store the spreadsheet ID and URL for future syncs
      if (existingSheet) {
        await base44.asServiceRole.entities.PlatformSetting.update(existingSheet.id, {
          setting_value: spreadsheetId,
          updated_by_user_id: user.id,
          updated_by_name: user.full_name || user.email,
        });
      } else {
        await base44.asServiceRole.entities.PlatformSetting.create({
          setting_key: SHEET_SETTING_KEY,
          setting_value: spreadsheetId,
          setting_type: 'string',
          description: 'Google Sheets ID for the live voting tally sync spreadsheet',
          updated_by_user_id: user.id,
          updated_by_name: user.full_name || user.email,
        });
      }

      // Also store the URL
      const urlSettings = await base44.asServiceRole.entities.PlatformSetting.filter(
        { setting_key: SHEET_URL_SETTING_KEY }
      );
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      if (urlSettings[0]) {
        await base44.asServiceRole.entities.PlatformSetting.update(urlSettings[0].id, {
          setting_value: sheetUrl,
        });
      } else {
        await base44.asServiceRole.entities.PlatformSetting.create({
          setting_key: SHEET_URL_SETTING_KEY,
          setting_value: sheetUrl,
          setting_type: 'string',
          description: 'Google Sheets URL for the live voting tally sync spreadsheet',
        });
      }
    }

    const lastCol = String.fromCharCode(64 + headers.length); // M

    // Write data to the sheet
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:${lastCol}${values.length + 1}?valueInputOption=USER_ENTERED`,
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
      const err = await updateResponse.json();
      console.error('Failed to write data to spreadsheet:', JSON.stringify(err));
      return Response.json({ error: 'Failed to write data to Google Sheet' }, { status: 502 });
    }

    // Format: summary row + header row
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
            // Summary row formatting
            {
              repeatCell: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.08, green: 0.05, blue: 0.15 },
                    textFormat: { bold: true, foregroundColor: { red: 0.65, green: 0.85, blue: 0.95 } },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
            // Header row formatting
            {
              repeatCell: {
                range: { sheetId: 0, startRowIndex: 1, endRowIndex: 2 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.15, green: 0.1, blue: 0.25 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
            {
              autoResizeDimensions: {
                dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: headers.length },
              },
            },
          ],
        }),
      }
    );

    // Log the sync
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_email: user.email,
      user_role: 'admin',
      action: 'sync_voting_tally_to_sheets',
      action_category: 'admin',
      entity_type: 'AwardsVote',
      details: `Synced ${categories.length} categories, ${nominees.length} nominees, ${votes.length} votes for ${year} cycle to Google Sheets`,
      severity: 'info',
    });

    return Response.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      syncedAt: syncTime,
      summary: {
        categories: categories.length,
        nominees: nominees.length,
        votes: votes.length,
      },
    });
  } catch (error) {
    console.error('syncVotingTallyToSheets error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});