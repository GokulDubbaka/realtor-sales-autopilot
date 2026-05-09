const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: false,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
    tls: {
      rejectUnauthorized: false,  // Fix: self-signed cert chain on some networks
    },
  });
  return transporter;
}

// ─── HTML email template ─────────────────────────────────────────
function buildEmailHTML(subject, clientData, messageBody) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #f4f6f8; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 32px; text-align: center; }
    .header h1 { color: #e8b86d; margin: 0; font-size: 22px; letter-spacing: 1px; }
    .header p { color: #a0aec0; margin: 6px 0 0; font-size: 13px; }
    .body { padding: 28px 32px; }
    .message { color: #2d3748; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
    .card { background: #f7fafc; border-left: 4px solid #e8b86d; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; }
    .card h3 { margin: 0 0 12px; color: #1a1a2e; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .field { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e2e8f0; }
    .field:last-child { border-bottom: none; }
    .field .label { color: #718096; font-size: 13px; font-weight: 600; }
    .field .value { color: #2d3748; font-size: 13px; }
    .footer { background: #f7fafc; padding: 16px 32px; text-align: center; color: #a0aec0; font-size: 11px; }
    .badge { display: inline-block; background: #fef5e7; color: #c05621; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏠 ${config.email.fromName}</h1>
      <p>Automated Sales Notification</p>
    </div>
    <div class="body">
      <div class="badge">${subject}</div>
      <div class="message">${messageBody}</div>
      <div class="card">
        <h3>Client Details</h3>
        <div class="field"><span class="label">Name</span><span class="value">${clientData.name}</span></div>
        <div class="field"><span class="label">Phone</span><span class="value">${clientData.phone}</span></div>
        <div class="field"><span class="label">Property</span><span class="value">${clientData.property || '—'}</span></div>
        <div class="field"><span class="label">Budget</span><span class="value">${clientData.budget || '—'}</span></div>
        <div class="field"><span class="label">Notes</span><span class="value">${clientData.notes || '—'}</span></div>
        <div class="field"><span class="label">Attempts</span><span class="value">${(clientData.attempts || 0) + 1}</span></div>
      </div>
    </div>
    <div class="footer">
      Sent automatically by Realtor Sales Autopilot · ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
    </div>
  </div>
</body>
</html>`;
}

// ─── Send voicemail / no-answer notification ─────────────────────
async function sendVoicemailEmail(clientData) {
  if (config.server.dryRun) {
    console.log(`[Email][DRY-RUN] Would send voicemail email to agent`);
    return;
  }
  return _sendVoicemailEmail(clientData);
}

// Force-send even in dry-run (used by simulator to test real email)
async function sendVoicemailEmail_FORCE(clientData) {
  return _sendVoicemailEmail(clientData);
}

async function _sendVoicemailEmail(clientData) {
  if (!config.email.user || !config.email.pass) {
    console.warn('[Email] SMTP credentials not configured — skipping');
    return;
  }

  const subject = '📞 Missed Call — Voicemail/No Answer';
  const body = `We attempted to call <strong>${clientData.name}</strong> at <strong>${clientData.phone}</strong> but reached voicemail or received no answer. A WhatsApp message has been sent. Please follow up manually when possible.`;

  try {
    await getTransporter().sendMail({
      from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
      to: config.email.user, // Internal notification to yourself
      subject: `[Realtor Bot] ${subject} — ${clientData.name}`,
      html: buildEmailHTML(subject, clientData, body),
    });
    console.log(`[Email] ✅ Voicemail notification sent for ${clientData.name}`);
  } catch (err) {
    console.error(`[Email] ❌ Failed:`, err.message);
    throw err;
  }
}

// ─── Send all-agents-missed notification ─────────────────────────
async function sendMissedCallEmail(clientData) {
  if (config.server.dryRun) {
    console.log(`[Email][DRY-RUN] Would send missed-call email`);
    return;
  }
  if (!config.email.user || !config.email.pass) {
    console.warn('[Email] SMTP credentials not configured — skipping');
    return;
  }

  const subject = '🔴 All Agents Missed — Immediate Follow-Up Needed';
  const body = `<strong>${clientData.name}</strong> answered the call but all agents in the hunt group were unavailable. The client was sent a WhatsApp message. This requires immediate manual follow-up.`;

  try {
    await getTransporter().sendMail({
      from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
      to: config.email.user,
      subject: `[Realtor Bot] ${subject} — ${clientData.name}`,
      html: buildEmailHTML(subject, clientData, body),
    });
    console.log(`[Email] ✅ All-missed notification sent for ${clientData.name}`);
  } catch (err) {
    console.error(`[Email] ❌ Failed:`, err.message);
  }
}

module.exports = {
  sendVoicemailEmail,
  sendVoicemailEmail_FORCE,
  sendMissedCallEmail,
};
