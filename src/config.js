require('dotenv').config();
const path = require('path');

function require_env(key) {
  const val = process.env[key];
  if (!val && process.env.DRY_RUN !== 'true') {
    throw new Error(`Missing required environment variable: ${key}\nCheck your .env file — copy setup.env.template to .env and fill in the values.`);
  }
  return val || '';
}

const config = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    dashboardPort: parseInt(process.env.DASHBOARD_PORT || '3001'),
    logLevel: process.env.LOG_LEVEL || 'info',
    dryRun: process.env.DRY_RUN === 'true',
    callDelayMs: parseInt(process.env.CALL_DELAY_MS || '30000'),
  },
  adb: {
    path: process.env.ADB_PATH || './platform-tools/adb.exe',
    device: process.env.ADB_DEVICE || null,
    amdVoicemailThresholdMs: parseInt(process.env.AMD_VOICEMAIL_THRESHOLD_MS || '8000'),
  },
  agents: [
    {
      name: process.env.AGENT_1_NAME || 'Agent 1',
      phone: process.env.AGENT_1_PHONE || '',
      index: 1,
    },
    {
      name: process.env.AGENT_2_NAME || '',
      phone: process.env.AGENT_2_PHONE || '',
      index: 2,
    },
    {
      name: process.env.AGENT_3_NAME || '',
      phone: process.env.AGENT_3_PHONE || '',
      index: 3,
    },
  ].filter(a => a.phone && a.phone.length > 0),
  agentTimeoutSeconds: parseInt(process.env.AGENT_TIMEOUT_SECONDS || '25'),
  sheets: {
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    privateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
    clientsTab: process.env.SHEET_CLIENTS_TAB || 'Clients',
    missedTab: process.env.SHEET_MISSED_TAB || 'Missed Calls',
    logTab: process.env.SHEET_LOG_TAB || 'Call Log',
  },
  whatsapp: {
    phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID || '',
    accessToken: process.env.META_WA_ACCESS_TOKEN || '',
    voicemailTemplate: process.env.META_WA_VOICEMAIL_TEMPLATE || 'realtor_voicemail_notify',
    missedTemplate: process.env.META_WA_MISSED_TEMPLATE || 'realtor_missed_all',
    businessName: process.env.META_WA_BUSINESS_NAME || 'Realty Team',
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.EMAIL_FROM_NAME || 'Realty Team',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || '',
  },
};

module.exports = config;
