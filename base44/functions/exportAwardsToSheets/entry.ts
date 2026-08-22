import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const year = body.year || new Date().getFullYear();

    // Get Google Sheets connection (SHARED mode — platform OAuth app)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    // Fetch all categories, nominees, and votes for the cycle
    const categories = await base44.asServiceRole.entities.AwardsCategory.filter(
      { year }, 'sort_order', 200
    );
    const nominees = await base44.asServiceRole.entities.AwardsNominee.filter(
      { year }, '-votes_count', 1000
    );
    const votes = await base44.asServiceRole.entities.AwardsVote.filter(
      { voting_cycle: year }, '-voted_date', 5000
    );

    if (categories.length === 0) {
      return Response.json({ error: `No award categories found for ${year}` }, { status: 404 });
    }

    // Build nominee lookup: category_id -> [nominees]
    const nomineesByCategory = {};
    nominees.forEach(n => {
      if (!nomineesByCategory[n.category_id]) nomineesByCategory[n.category_id] = [];
      nomineesByCategory[n.category_id].push(n);
    });

    // Build vote tally: category_id -> { nominee_id -> count, total_votes }
    const tallyByCategory = {};
    votes.forEach(v => {
      if (!tallyByCategory[v.category_id]) {
        tallyByCategory[v.category_id] = { tally: {}, total_votes: 0 };
      }
      tallyByCategory[v.category_id].total_votes++;
      const key = v.nominee_id || 'abstain';
      tallyByCategory[v.category_id].tally[key] = (tallyByCategory[v.category_id].tally[key] || 0) + 1;
    });

    // Create a new Google Sheet
    const sheetTitle = `My Life Awards — Nominations & Voting — ${year} — ${new Date().toLocaleDateString()}`;
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title: sheetTitle },
      }),
    });

    if (!createResponse.ok) {
      const err = await createResponse.json();
      console.error('Failed to create spreadsheet:', JSON.stringify(err));
      return Response.json({ error: 'Failed to create Google Sheet' }, { status: 502 });
    }

    const spreadsheet = await createResponse.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // Prepare rows: one row per nominee, with category and vote tally
    const headers = [
      'Category',
      'Category Type',
      'Voting Phase',
      'Nominee',
      'Nominee Type',
      'Nominee Status',
      'Vote Count',
      'Vote Percentage',
      'Rank',
      'Nomination Reason',
    ];

    const rows = [];
    categories.forEach(cat => {
      const catNominees = nomineesByCategory[cat.id] || [];
      const catTally = tallyByCategory[cat.id] || { tally: {}, total_votes: 0 };
      const totalVotes = catTally.total_votes;

      // Sort nominees by vote count descending for ranking
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
          '(No nominees)',
          '', '', '0', '0%', '',
          '',
        ]);
        return;
      }

      sorted.forEach((nominee, idx) => {
        const voteCount = catTally.tally[nominee.id] || 0;
        const pct = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(1) + '%' : '0%';
        rows.push([
          cat.name,
          cat.category_type?.replace(/_/g, ' ') || '',
          cat.voting_phase?.replace(/_/g, ' ') || '',
          nominee.nominee_name,
          nominee.nominee_type?.replace(/_/g, ' ') || '',
          nominee.status?.replace(/_/g, ' ') || '',
          String(voteCount),
          pct,
          String(idx + 1),
          nominee.nomination_reason || '',
        ]);
      });
    });

    const values = [headers, ...rows];
    const lastCol = String.fromCharCode(64 + headers.length); // J

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

    // Format the header row (bold, dark background, white text)
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
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
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

    // Log the export
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_email: user.email,
      user_role: 'admin',
      action: 'export_awards_to_sheets',
      action_category: 'admin',
      entity_type: 'AwardsCategory',
      details: `Exported ${categories.length} categories, ${nominees.length} nominees, and ${votes.length} votes for ${year} cycle to Google Sheets`,
      severity: 'info',
    });

    return Response.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      summary: {
        categories: categories.length,
        nominees: nominees.length,
        votes: votes.length,
      },
    });
  } catch (error) {
    console.error('exportAwardsToSheets error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});