/**
 * REALTOR SALES AUTOPILOT -- DRY RUN SIMULATOR
 *
 * Runs all 3 call scenarios locally without real calls or emails.
 * Uses safe fixture agent data so the demo always shows real-looking output
 * regardless of whether .env is configured.
 *
 * Usage:
 *   node scripts/simulate.js            -- fully local, no side effects
 *   node scripts/simulate.js --send-email -- also tests real SMTP delivery
 */

process.env.DRY_RUN = 'true';
require('dotenv').config();

const emailService             = require('../src/services/email.service');
const { startDashboard, broadcastToManagers } = require('../src/dashboard/server');
const config                   = require('../src/config');

// ── CLI flag ──────────────────────────────────────────────────
const SEND_EMAIL = process.argv.includes('--send-email');

// ── Safe fixture agent (never reads undefined from config) ───────────────
const FIXTURE_AGENT = {
  name:  (config.agents && config.agents[0] && config.agents[0].name)  || 'Agent Gokul (fixture)',
  phone: (config.agents && config.agents[0] && config.agents[0].phone) || '+919000000099',
};
const DASHBOARD_PORT = (config.server && config.server.dashboardPort) || 3001;

// ── Colour helpers ───────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
  cyan: '\x1b[36m', blue: '\x1b[34m', magenta: '\x1b[35m',
};
const ok   = (m) => console.log(`  ${C.green}\u2705${C.reset} ${m}`);
const warn = (m) => console.log(`  ${C.yellow}\u26A0\uFE0F${C.reset}  ${m}`);
const info = (m) => console.log(`  ${C.cyan}\u2139\uFE0F${C.reset}  ${m}`);
const err  = (m) => console.log(`  ${C.red}\u274C${C.reset} ${m}`);
const sep  = (label) => {
  console.log(`\n${C.bold}${C.blue}${'\u2500'.repeat(60)}${C.reset}`);
  console.log(`${C.bold}${C.blue}  ${label}${C.reset}`);
  console.log(`${C.bold}${C.blue}${'\u2500'.repeat(60)}${C.reset}`);
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Test clients (all placeholder numbers) ──────────────────────────
const TEST_CLIENTS = [
  {
    rowIndex: 2, name: 'Rajesh Kumar',  phone: '+919000000001',
    email: 'rajesh@example.com', whatsapp: '+919000000001',
    property: '3BHK Apartment \u2013 Whitefield', budget: '\u20B985L',
    notes: 'Prefers east-facing. Wants possession by Dec 2025.',
    status: 'Pending', attempts: 0, _scenario: 'NO_ANSWER',
  },
  {
    rowIndex: 3, name: 'Priya Sharma',  phone: '+919000000002',
    email: 'priya@example.com', whatsapp: '+919000000002',
    property: '2BHK Flat \u2013 Sarjapur Road', budget: '\u20B955L',
    notes: 'Ready to visit anytime this week.',
    status: 'Pending', attempts: 1, _scenario: 'VOICEMAIL',
  },
  {
    rowIndex: 4, name: 'Anil Mehta',    phone: '+919000000003',
    email: 'anil@example.com', whatsapp: '+919000000003',
    property: 'Villa \u2013 Devanahalli', budget: '\u20B91.8Cr',
    notes: 'NRI returning in June. Looking for premium gated community.',
    status: 'Pending', attempts: 0, _scenario: 'HUMAN_CONNECTED',
  },
];

const results = [];

async function simulateClient(client) {
  sep(`SCENARIO: ${client._scenario}  |  Client: ${client.name}`);
  console.log(`\n${C.dim}  Phone    : ${client.phone}${C.reset}`);
  console.log(`${C.dim}  Property : ${client.property}${C.reset}`);
  console.log(`${C.dim}  Budget   : ${client.budget}${C.reset}`);
  console.log(`${C.dim}  Notes    : ${client.notes}${C.reset}\n`);

  broadcastToManagers({
    type: 'CALL_START', callId: `sim_${client.rowIndex}`,
    clientName: client.name, clientPhone: client.phone,
  });

  info(`[ADB][DRY-RUN] Would dial ${client.phone} via Poco C61`);
  await sleep(800);

  if (client._scenario === 'NO_ANSWER') {
    warn('[ADB] No answer after 35s \u2014 hanging up');
    broadcastToManagers({ type: 'NO_ANSWER', callId: `sim_${client.rowIndex}`, clientName: client.name });
    info('[Sheets][DRY-RUN] Would update row status \u2192 No Answer');
    info('[Sheets][DRY-RUN] Would append to Missed Calls tab');
    await sleep(300);
    if (SEND_EMAIL) {
      console.log(`\n  ${C.magenta}\uD83D\uDCE7 Sending REAL email to ${config.email && config.email.user}... (--send-email active)${C.reset}`);
      try {
        await emailService.sendVoicemailEmail_FORCE(client);
        ok('Email delivered');
        results.push({ client: client.name, scenario: 'NO_ANSWER', email: '\u2705 SENT' });
      } catch (e) {
        err(`Email failed: ${e.message}`);
        results.push({ client: client.name, scenario: 'NO_ANSWER', email: '\u274C FAILED' });
      }
    } else {
      info('[Email][DRY-RUN] Would send voicemail email. Use --send-email to test real delivery.');
      results.push({ client: client.name, scenario: 'NO_ANSWER', email: '\u2014 (dry-run)' });
    }

  } else if (client._scenario === 'VOICEMAIL') {
    ok('[ADB] Call connected at 0:00');
    await sleep(500);
    warn('[AMD] Call dropped after ~6s \u2192 VOICEMAIL detected');
    broadcastToManagers({ type: 'VOICEMAIL', callId: `sim_${client.rowIndex}`, clientName: client.name });
    info('[Sheets][DRY-RUN] Would update row status \u2192 Voicemail');
    await sleep(300);
    if (SEND_EMAIL) {
      console.log(`\n  ${C.magenta}\uD83D\uDCE7 Sending REAL email... (--send-email active)${C.reset}`);
      try {
        await emailService.sendVoicemailEmail_FORCE(client);
        ok('Email delivered');
        results.push({ client: client.name, scenario: 'VOICEMAIL', email: '\u2705 SENT' });
      } catch (e) {
        err(`Email failed: ${e.message}`);
        results.push({ client: client.name, scenario: 'VOICEMAIL', email: '\u274C FAILED' });
      }
    } else {
      info('[Email][DRY-RUN] Would send voicemail email. Use --send-email to test real delivery.');
      results.push({ client: client.name, scenario: 'VOICEMAIL', email: '\u2014 (dry-run)' });
    }

  } else if (client._scenario === 'HUMAN_CONNECTED') {
    ok('[ADB] Call connected at 0:00');
    await sleep(500);
    ok('[AMD] Call stayed active past 8s \u2192 HUMAN DETECTED');
    broadcastToManagers({ type: 'HUMAN_DETECTED', callId: `sim_${client.rowIndex}`, clientName: client.name });
    await sleep(300);
    console.log(`\n  ${C.cyan}\uD83D\uDD04 Hunt Group: Trying Agent 1 \u2014 ${FIXTURE_AGENT.name} (${FIXTURE_AGENT.phone})${C.reset}`);
    broadcastToManagers({
      type: 'HUNT_ATTEMPT', callId: `sim_${client.rowIndex}`,
      agentName: FIXTURE_AGENT.name, agentIndex: 1, clientName: client.name,
    });
    await sleep(600);
    info(`[ADB][DRY-RUN] Would call agent ${FIXTURE_AGENT.phone}`);
    await sleep(800);
    ok(`[Hunt] ${FIXTURE_AGENT.name} answered (simulated)!`);
    broadcastToManagers({
      type: 'AGENT_CONNECTED', callId: `sim_${client.rowIndex}`,
      agentName: FIXTURE_AGENT.name, clientName: client.name,
    });
    ok(`[ScreenPop] http://localhost:${DASHBOARD_PORT}/client/${client.rowIndex}`);
    info('[Sheets][DRY-RUN] Would update row status \u2192 Contacted');
    ok('[Email] No email needed \u2014 call was connected!');
    results.push({ client: client.name, scenario: 'HUMAN_CONNECTED', email: '\u2014 (not needed)' });
  }

  await sleep(500);
}

function printSummary() {
  sep('\uD83E\uDDEA DRY RUN COMPLETE \u2014 Results Summary');
  console.log('');
  console.log(`  ${'Client'.padEnd(18)} ${'Scenario'.padEnd(20)} ${'Email'}`);
  console.log(`  ${'\u2500'.repeat(55)}`);
  for (const r of results) {
    console.log(`  ${r.client.padEnd(18)} ${r.scenario.padEnd(20)} ${r.email}`);
  }
  console.log('');
  if (SEND_EMAIL) {
    warn('--send-email was active: real emails were dispatched via SMTP.');
  } else {
    ok('Fully local run \u2014 no external side effects. Use --send-email to test email delivery.');
  }
  ok(`Dashboard: http://localhost:${DASHBOARD_PORT}`);
  ok(`Manager:   http://localhost:${DASHBOARD_PORT}/manager`);
  console.log(`\n${C.dim}  Press Ctrl+C to stop the dashboard server.${C.reset}\n`);
}

async function main() {
  console.log(`\n${C.bold}${C.cyan}\u2554${'\u2550'.repeat(62)}\u2557${C.reset}`);
  console.log(`${C.bold}${C.cyan}\u2551  \uD83C\uDFE0 REALTOR SALES AUTOPILOT \u2014 DRY RUN SIMULATOR             \u2551${C.reset}`);
  console.log(`${C.bold}${C.cyan}\u255A${'\u2550'.repeat(62)}\u255D${C.reset}\n`);
  info('Mode: DRY RUN \u2014 no real calls will be made');
  info(SEND_EMAIL ? `Email: LIVE (--send-email flag active)` : 'Email: dry-run only (pass --send-email to test real delivery)');
  info(`Agent fixture: ${FIXTURE_AGENT.name} (${FIXTURE_AGENT.phone})`);
  info(`Dashboard port: ${DASHBOARD_PORT}`);

  try {
    await startDashboard();
    ok(`Dashboard started \u2192 http://localhost:${DASHBOARD_PORT}`);
  } catch (e) {
    warn(`Dashboard failed to start: ${e.message} (continuing without it)`);
  }

  await sleep(1000);

  for (const client of TEST_CLIENTS) {
    await simulateClient(client);
    await sleep(1500);
  }

  printSummary();
}

main().catch(e => {
  console.error('\n\u274C Simulator crashed:', e.message);
  process.exit(1);
});
