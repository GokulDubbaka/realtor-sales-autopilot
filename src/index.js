require('dotenv').config();
const { startDashboard } = require('./dashboard/server');
const { runDialer } = require('./core/orchestrator');

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   🏠  REALTOR SALES AUTOPILOT  v1.0               ║');
  console.log('║   Zero-Subscription Outbound Engine               ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // Start the dashboard server first
  await startDashboard();

  // Small delay to let server settle
  await new Promise(r => setTimeout(r, 500));

  // Run the dialer
  await runDialer();

  console.log('\n[Main] System shutting down gracefully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n[FATAL]', err.message);
  console.error('→ Check your .env file and make sure all values are set.');
  console.error('→ See setup.env.template for instructions.\n');
  process.exit(1);
});
