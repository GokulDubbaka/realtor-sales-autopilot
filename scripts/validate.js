/**
 * Config Validator -- run with: npm run validate
 *
 * Checks all required environment variables before any live operation.
 * Exits with code 1 if any required value is missing, default, or placeholder.
 * Treats DASHBOARD_TOKEN as required -- a missing/default token is a security gap.
 */
require('dotenv').config();
const fs = require('fs');

console.log('\n\uD83D\uDD0D Realtor Autopilot -- Config Validator\n');

let allOk = true;

function check(name, value, hint = '') {
  const placeholder = !value
    || value.includes('your_')
    || value.includes('xxxxxxx')
    || value.includes('change_me')
    || value.includes('CHANGE_ME');
  if (placeholder) {
    console.log(`  \u274C ${name} -- NOT SET or still default${hint ? '\n     \u2192 ' + hint : ''}`);
    allOk = false;
  } else {
    console.log(`  \u2705 ${name}`);
  }
}

// ── SECURITY: Dashboard token must be set before production use ────────────────
console.log('Security:');
const token = process.env.DASHBOARD_TOKEN;
if (!token || token === 'change_me_to_a_strong_random_token' || token.length < 16) {
  console.log('  \u274C DASHBOARD_TOKEN -- NOT SET or still default');
  console.log('     \u2192 Generate a strong token: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.log('     \u2192 The manager dashboard exposes live sales data -- this token protects it.');
  allOk = false;
} else {
  console.log('  \u2705 DASHBOARD_TOKEN');
}

// ── ADB ───────────────────────────────────────────────────────────────────────
console.log('\nAndroid Device (ADB):');
const adbPath = process.env.ADB_PATH || './platform-tools/adb.exe';
if (fs.existsSync(adbPath)) {
  console.log(`  \u2705 ADB_PATH -- found at ${adbPath}`);
} else {
  console.log(`  \u274C ADB_PATH -- not found at ${adbPath}`);
  console.log('     \u2192 Download Android Platform Tools and set ADB_PATH in .env');
  allOk = false;
}

// ── AGENTS ────────────────────────────────────────────────────────────────────
console.log('\nAgents:');
check('AGENT_1_PHONE', process.env.AGENT_1_PHONE, 'Set your primary agent phone number (e.g. +91XXXXXXXXXX)');

// ── GOOGLE SHEETS ─────────────────────────────────────────────────────────────
console.log('\nGoogle Sheets:');
check('GOOGLE_SERVICE_ACCOUNT_EMAIL', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  'Get from Google Cloud Console \u2192 Service Accounts');
check('GOOGLE_PRIVATE_KEY', process.env.GOOGLE_PRIVATE_KEY,
  'Get from Service Account JSON key file');
check('GOOGLE_SPREADSHEET_ID', process.env.GOOGLE_SPREADSHEET_ID,
  'Get from Google Sheets URL');

// ── WHATSAPP ──────────────────────────────────────────────────────────────────
console.log('\nWhatsApp Cloud API (optional):');
if (!process.env.META_WA_PHONE_NUMBER_ID || !process.env.META_WA_ACCESS_TOKEN) {
  console.log('  \u26A0\uFE0F  WhatsApp credentials not set -- WhatsApp notifications will be SKIPPED');
  console.log('     \u2192 Get from: developers.facebook.com \u2192 Your App \u2192 WhatsApp \u2192 API Setup');
} else {
  console.log('  \u2705 META_WA_PHONE_NUMBER_ID');
  console.log('  \u2705 META_WA_ACCESS_TOKEN');
}

// ── EMAIL ─────────────────────────────────────────────────────────────────────
console.log('\nEmail (Gmail SMTP):');
check('SMTP_USER', process.env.SMTP_USER, 'Your Gmail address');
check('SMTP_PASS', process.env.SMTP_PASS,
  'Gmail App Password from myaccount.google.com \u2192 Security \u2192 App Passwords');

// ── SUMMARY ───────────────────────────────────────────────────────────────────
console.log('\n' + '\u2500'.repeat(55));
if (allOk) {
  console.log('\u2705 All required configs are set. Ready to run!\n');
  console.log('Next step: Connect Poco C61 via USB and run:  npm start\n');
} else {
  console.log('\u26A0\uFE0F  Some required configs are missing or still at defaults.');
  console.log('   Copy setup.env.template \u2192 .env and fill in your values.\n');
  process.exit(1);
}
