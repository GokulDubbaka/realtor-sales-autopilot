const { google } = require('googleapis');
const config = require('../config');

let sheetsClient = null;

// ─── Initialize Google Sheets auth ──────────────────────────────
async function getClient() {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.sheets.serviceAccountEmail,
      private_key: config.sheets.privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

// ─── Column indices (0-based) ────────────────────────────────────
const COL = {
  NAME: 0,        // A: Client Name
  PHONE: 1,       // B: Phone (E.164 +91...)
  EMAIL: 2,       // C: Email
  WHATSAPP: 3,    // D: WhatsApp number (if different from phone)
  PROPERTY: 4,    // E: Property Interest
  BUDGET: 5,      // F: Budget
  NOTES: 6,       // G: Notes
  STATUS: 7,      // H: Status (auto-updated)
  LAST_CONTACT: 8, // I: Last Contacted
  ATTEMPTS: 9,    // J: Call Attempts
};

// ─── Read all active (undialed) clients ─────────────────────────
async function getActiveClients() {
  if (config.server.dryRun) {
    return [{
      rowIndex: 2, name: 'Test Client', phone: '+919000000000',
      email: 'test@example.com', whatsapp: '+919000000000',
      property: '3BHK Apartment', budget: '₹80L', notes: 'Interested in south zone',
      status: 'Pending', attempts: 0,
    }];
  }

  const client = await getClient();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: config.sheets.spreadsheetId,
    range: `${config.sheets.clientsTab}!A2:J`,
  });

  const rows = res.data.values || [];
  return rows
    .map((row, i) => ({
      rowIndex: i + 2, // 1-indexed, +1 for header
      name: row[COL.NAME] || '',
      phone: row[COL.PHONE] || '',
      email: row[COL.EMAIL] || '',
      whatsapp: row[COL.WHATSAPP] || row[COL.PHONE] || '',
      property: row[COL.PROPERTY] || '',
      budget: row[COL.BUDGET] || '',
      notes: row[COL.NOTES] || '',
      status: row[COL.STATUS] || 'Pending',
      attempts: parseInt(row[COL.ATTEMPTS] || '0'),
    }))
    .filter(c => c.phone && (c.status === 'Pending' || c.status === 'Retry'));
}

// ─── Update a client's status inline ────────────────────────────
async function updateClientStatus(rowIndex, status) {
  if (config.server.dryRun) {
    console.log(`[Sheets][DRY-RUN] Would update row ${rowIndex} status → ${status}`);
    return;
  }
  const client = await getClient();
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  await client.spreadsheets.values.update({
    spreadsheetId: config.sheets.spreadsheetId,
    range: `${config.sheets.clientsTab}!H${rowIndex}:I${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[status, now]] },
  });
}

// ─── Increment call attempt counter ─────────────────────────────
async function incrementAttempts(rowIndex, currentAttempts) {
  if (config.server.dryRun) return;
  const client = await getClient();
  await client.spreadsheets.values.update({
    spreadsheetId: config.sheets.spreadsheetId,
    range: `${config.sheets.clientsTab}!J${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[currentAttempts + 1]] },
  });
}

// ─── Append to Missed Calls tab ──────────────────────────────────
async function appendMissedCall(clientData, reason) {
  if (config.server.dryRun) {
    console.log(`[Sheets][DRY-RUN] Would log missed call for ${clientData.name}`);
    return;
  }
  const client = await getClient();
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  await client.spreadsheets.values.append({
    spreadsheetId: config.sheets.spreadsheetId,
    range: `${config.sheets.missedTab}!A:F`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        clientData.name,
        clientData.phone,
        clientData.property,
        reason,
        now,
        clientData.rowIndex,
      ]],
    },
  });
}

// ─── Append to Call Log tab ──────────────────────────────────────
async function appendCallLog(entry) {
  if (config.server.dryRun) {
    console.log(`[Sheets][DRY-RUN] Would log: ${JSON.stringify(entry)}`);
    return;
  }
  const client = await getClient();
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  await client.spreadsheets.values.append({
    spreadsheetId: config.sheets.spreadsheetId,
    range: `${config.sheets.logTab}!A:G`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        entry.clientName,
        entry.clientPhone,
        entry.outcome,        // HUMAN_CONNECTED, VOICEMAIL, NO_ANSWER, ALL_MISSED
        entry.agentConnected || 'None',
        entry.durationSec || 0,
        now,
        entry.notes || '',
      ]],
    },
  });
}

module.exports = {
  getActiveClients,
  updateClientStatus,
  incrementAttempts,
  appendMissedCall,
  appendCallLog,
};
