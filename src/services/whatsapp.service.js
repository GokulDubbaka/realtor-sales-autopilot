const axios = require('axios');
const config = require('../config');

const GRAPH_URL = 'https://graph.facebook.com/v21.0';

// ─── Send WhatsApp template message ────────────────────────────
async function sendTemplate(to, templateName, params) {
  if (config.server.dryRun) {
    console.log(`[WhatsApp][DRY-RUN] Would send template "${templateName}" to ${to}`);
    return;
  }
  if (!config.whatsapp.phoneNumberId || !config.whatsapp.accessToken) {
    console.warn('[WhatsApp] Credentials not configured — skipping');
    return;
  }

  // WhatsApp requires E.164 without '+': 919177390525
  const cleanTo = to.replace(/^\+/, '').replace(/\s+/g, '');

  const components = params.map((text, i) => ({
    type: 'text',
    text: String(text),
  }));

  try {
    const res = await axios.post(
      `${GRAPH_URL}/${config.whatsapp.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: components,
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${config.whatsapp.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    console.log(`[WhatsApp] ✅ Sent "${templateName}" to ${to}`);
    return res.data;
  } catch (err) {
    const errData = err.response?.data || err.message;
    console.error(`[WhatsApp] ❌ Failed to send to ${to}:`, errData);
  }
}

// ─── Voicemail / No Answer notification ─────────────────────────
// Template body: "Hi {{1}}, we tried calling you regarding your property inquiry.
//                We'll reach out again soon! — {{2}}"
async function sendVoicemailNotification(clientPhone, clientName) {
  return sendTemplate(
    clientPhone,
    config.whatsapp.voicemailTemplate,
    [clientName, config.whatsapp.businessName]
  );
}

// ─── All agents missed notification ─────────────────────────────
// Template body: "Hi {{1}}, sorry we missed your call. Our team will
//                get back to you shortly! — {{2}}"
async function sendMissedCallNotification(clientPhone, clientName) {
  return sendTemplate(
    clientPhone,
    config.whatsapp.missedTemplate,
    [clientName, config.whatsapp.businessName]
  );
}

module.exports = {
  sendVoicemailNotification,
  sendMissedCallNotification,
};
