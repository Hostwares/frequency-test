// Lazily provisioned master Google Sheet that logs every direct song purchase.
// The spreadsheet is created once on first sale and its ID is persisted in
// PlatformSetting so subsequent purchases append to the same sheet.
//
// Each artist gets their own tab (auto-created on first sale for that artist)
// so artists can manage their own accounting records. A master aggregate
// tab ("Sheet1") is also kept for platform-wide reporting.

const SETTING_KEY = "song_sales_google_sheet_id";
const SHEET_TITLE = "Frequency — Song Sales Log";
const TAB = "Sheet1";

const HEADERS = [
  "Date",
  "Order #",
  "Fan Name",
  "Fan Email",
  "Artist",
  "Song",
  "Price (USD)",
  "Quantity",
  "Line Total (USD)",
  "Payment Status",
  "Source Song ID",
];

// Google Sheets tab titles: max 100 chars, no : \ / ? * [ ]
function tabTitleFor(artistName, artistProfileId) {
  const base = (artistName || "Unknown Artist")
    .replace(/[:\\/?*[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "Unknown Artist";
  const shortId = (artistProfileId || "").slice(0, 6);
  return shortId ? `${base} \u00b7 ${shortId}` : base;
}

async function getOrCreateSpreadsheetId(base44) {
  const existing = await base44.asServiceRole.entities.PlatformSetting.filter({
    setting_key: SETTING_KEY,
  });
  if (existing && existing.length > 0 && existing[0].setting_value) {
    return existing[0].setting_value;
  }

  const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties: { title: SHEET_TITLE } }),
  });
  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || "Failed to create sales spreadsheet");
  }
  const sheet = await createRes.json();
  const spreadsheetId = sheet.spreadsheetId;

  // Write the header row to the master aggregate tab
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${TAB}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [HEADERS] }),
    }
  );

  await base44.asServiceRole.entities.PlatformSetting.create({
    setting_key: SETTING_KEY,
    setting_value: spreadsheetId,
    setting_type: "string",
    description: "Google Sheet ID for the automatic song sales log",
  });

  return spreadsheetId;
}

// Create a per-artist tab (with header row) if it doesn't already exist.
async function ensureArtistTab(accessToken, spreadsheetId, tabTitle) {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (metaRes.ok) {
    const meta = await metaRes.json();
    const exists = (meta.sheets || []).some(
      (s) => s.properties?.title === tabTitle
    );
    if (exists) return;
  }

  // Add the tab
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: tabTitle } } }],
      }),
    }
  );

  // Write the header row to the new tab
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabTitle)}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [HEADERS] }),
    }
  );
}

export async function appendSongSale(base44, sale) {
  const spreadsheetId = await getOrCreateSpreadsheetId(base44);
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

  const row = [
    sale.date,
    sale.orderNumber,
    sale.fanName,
    sale.fanEmail,
    sale.artistName,
    sale.songTitle,
    sale.price,
    sale.quantity,
    sale.lineTotal,
    sale.paymentStatus,
    sale.sourceSongId,
  ];

  // Master aggregate tab
  const masterRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${TAB}!A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!masterRes.ok) {
    const err = await masterRes.json();
    throw new Error(err.error?.message || "Failed to append song sale row");
  }

  // Per-artist tab — auto-created on first sale for this artist
  const tabTitle = tabTitleFor(sale.artistName, sale.artistProfileId);
  try {
    await ensureArtistTab(accessToken, spreadsheetId, tabTitle);
  } catch (e) {
    // Tab likely already exists (e.g. concurrent webhook) — continue to append
    console.error("ensureArtistTab (continuing):", e.message);
  }

  const artistRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabTitle)}!A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!artistRes.ok) {
    const err = await artistRes.json();
    throw new Error(err.error?.message || "Failed to append song sale row (artist tab)");
  }
}