const adbService = require('../services/adb.service');
const sheetsService = require('../services/sheets.service');
const whatsappService = require('../services/whatsapp.service');
const emailService = require('../services/email.service');
const callState = require('./call-state');
const config = require('../config');
const { broadcastToManagers } = require('../dashboard/server');
const openModule = require('open');
const OSINTProfiler = require('../osint_profiler');

const profiler = new OSINTProfiler();

// ─── Generate unique call ID ─────────────────────────────────────
function generateCallId() {
  return `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// ─── Open screen pop for agent ───────────────────────────────────
async function openScreenPop(clientData) {
  const url = `http://localhost:${config.server.dashboardPort}/client/${clientData.rowIndex}`;
  console.log(`[ScreenPop] 🖥️  Opening: ${url}`);
  try {
    await openModule.default(url).catch(() => openModule(url));
  } catch (e) {
    // Fallback for different open module versions
    try { require('open')(url); } catch {}
  }
}

// ─── Hunt Group: Try agents sequentially ────────────────────────
async function runHuntGroup(callId, clientData) {
  const agents = config.agents;

  callState.updateCall(callId, { phase: 'HUNTING' });

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    callState.updateCall(callId, { huntIndex: i });

    console.log(`[Hunt] 📲 Trying Agent ${i + 1}: ${agent.name} (${agent.phone})`);
    broadcastToManagers({
      type: 'HUNT_ATTEMPT',
      callId,
      agentName: agent.name,
      agentIndex: i + 1,
      clientName: clientData.name,
    });

    // Dial the agent via ADB (3-way call attempt or sequential ring)
    await adbService.makeCall(agent.phone);
    const result = await adbService.waitForCallConnect(config.agentTimeoutSeconds * 1000);

    if (result.result === 'ACTIVE') {
      // Agent answered!
      callState.updateCall(callId, {
        phase: 'CONNECTED',
        agentConnected: agent.name,
        outcome: 'CONNECTED',
      });
      console.log(`[Hunt] ✅ ${agent.name} connected! Opening screen pop...`);

      broadcastToManagers({
        type: 'AGENT_CONNECTED',
        callId,
        agentName: agent.name,
        clientName: clientData.name,
      });

      // Open screen pop
      await openScreenPop(clientData);

      // Wait for call to end naturally
      await adbService.detectAnswerType(Date.now());

      callState.updateCall(callId, { phase: 'DONE', outcome: 'COMPLETED' });
      return 'CONNECTED';
    }

    console.log(`[Hunt] ⚠️  ${agent.name} didn't answer (${result.result}). Trying next...`);

    // Small gap before trying next agent
    if (i < agents.length - 1) {
      await sleep(2000);
    }
  }

  // All agents missed
  return 'ALL_MISSED';
}

// ─── Main call flow for one client ──────────────────────────────
async function processClient(clientData) {
  const callId = generateCallId();
  const call = callState.createCall(callId, clientData);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`[Orchestrator] 📞 Calling: ${clientData.name} (${clientData.phone})`);
  console.log(`${'═'.repeat(60)}`);
  
  // [WORLD-CLASS] OSINT Predictive Profiling
  // Run background intelligence gathering before we even dial the number.
  const profile = await profiler.profileLead(clientData.phone, clientData.name);
  clientData.profile = profile; // Attach to client data so dashboard/agents can see the icebreaker

  broadcastToManagers({
    type: 'CALL_START',
    callId,
    clientName: clientData.name,
    clientPhone: clientData.phone,
  });

  // Update sheet — mark as "Dialing"
  await sheetsService.updateClientStatus(clientData.rowIndex, 'Dialing');
  await sheetsService.incrementAttempts(clientData.rowIndex, clientData.attempts);

  // Step A: Initiate call
  try {
    await adbService.makeCall(clientData.phone);
  } catch (err) {
    console.error('[Orchestrator] ❌ Failed to initiate call:', err.message);
    await sheetsService.updateClientStatus(clientData.rowIndex, 'Error');
    callState.endCall(callId);
    return;
  }

  // Wait for connection or no-answer
  const connectResult = await adbService.waitForCallConnect(35000);

  // ── Condition 1: No answer / Voicemail ──────────────────────
  if (connectResult.result === 'NO_ANSWER' || connectResult.result === 'TIMEOUT') {
    console.log(`[Orchestrator] 📵 No answer from ${clientData.name}`);

    await sheetsService.updateClientStatus(clientData.rowIndex, 'No Answer');
    await sheetsService.appendMissedCall(clientData, 'No Answer');
    await sheetsService.appendCallLog({
      clientName: clientData.name,
      clientPhone: clientData.phone,
      outcome: 'NO_ANSWER',
    });

    broadcastToManagers({ type: 'NO_ANSWER', callId, clientName: clientData.name });

    // Parallel: WhatsApp + Email
    await Promise.allSettled([
      whatsappService.sendVoicemailNotification(
        clientData.whatsapp || clientData.phone,
        clientData.name
      ),
      emailService.sendVoicemailEmail(clientData),
    ]);

    callState.endCall(callId);
    return;
  }

  // ── Call connected — AMD check ───────────────────────────────
  const connectedAt = Date.now();
  callState.updateCall(callId, { phase: 'AMD', connectedAt });
  console.log(`[Orchestrator] ✅ Call connected — running AMD detection...`);

  // Brief AMD window — check if call drops quickly (voicemail)
  await sleep(config.adb.amdVoicemailThresholdMs);
  const stateAfterAMD = await adbService.getCallState();

  // ── Condition 1b: Voicemail detected (call dropped after ~8s) ─
  if (stateAfterAMD === 'IDLE') {
    console.log(`[Orchestrator] 🔊 Voicemail detected for ${clientData.name}`);

    await sheetsService.updateClientStatus(clientData.rowIndex, 'Voicemail');
    await sheetsService.appendMissedCall(clientData, 'Voicemail');
    await sheetsService.appendCallLog({
      clientName: clientData.name,
      clientPhone: clientData.phone,
      outcome: 'VOICEMAIL',
    });

    broadcastToManagers({ type: 'VOICEMAIL', callId, clientName: clientData.name });

    await Promise.allSettled([
      whatsappService.sendVoicemailNotification(
        clientData.whatsapp || clientData.phone,
        clientData.name
      ),
      emailService.sendVoicemailEmail(clientData),
    ]);

    callState.endCall(callId);
    return;
  }

  // ── Condition 2: Human answered — start hunt group ───────────
  console.log(`[Orchestrator] 👤 HUMAN DETECTED — starting hunt group for ${clientData.name}`);
  broadcastToManagers({ type: 'HUMAN_DETECTED', callId, clientName: clientData.name });

  const huntResult = await runHuntGroup(callId, clientData);

  if (huntResult === 'ALL_MISSED') {
    console.log(`[Orchestrator] 🔴 All agents missed — sending notifications`);

    await adbService.endCall();
    await sheetsService.updateClientStatus(clientData.rowIndex, 'All Missed');
    await sheetsService.appendMissedCall(clientData, 'All Agents Missed');
    await sheetsService.appendCallLog({
      clientName: clientData.name,
      clientPhone: clientData.phone,
      outcome: 'ALL_MISSED',
    });

    broadcastToManagers({ type: 'ALL_MISSED', callId, clientName: clientData.name });

    await Promise.allSettled([
      whatsappService.sendMissedCallNotification(
        clientData.whatsapp || clientData.phone,
        clientData.name
      ),
      emailService.sendMissedCallEmail(clientData),
    ]);
  } else {
    // Successfully connected
    await sheetsService.updateClientStatus(clientData.rowIndex, 'Contacted');
    const finalCall = callState.getCall(callId);
    await sheetsService.appendCallLog({
      clientName: clientData.name,
      clientPhone: clientData.phone,
      outcome: 'CONNECTED',
      agentConnected: finalCall?.agentConnected || 'Unknown',
    });
  }

  callState.endCall(callId);
  console.log(`[Orchestrator] ✅ Done processing ${clientData.name}\n`);
}

// ─── Main dialer loop ────────────────────────────────────────────
async function runDialer() {
  console.log('\n🏠 Realtor Sales Autopilot — Starting Dialer');
  console.log(`Mode: ${config.server.dryRun ? '🧪 DRY RUN' : '🔴 LIVE'}`);
  console.log(`Agents: ${config.agents.map(a => a.name).join(', ')}`);
  console.log(`Call delay: ${config.server.callDelayMs / 1000}s between calls\n`);

  // Check ADB device
  if (!config.server.dryRun) {
    await adbService.checkDevice();
  }

  let clients = await sheetsService.getActiveClients();
  console.log(`[Orchestrator] Found ${clients.length} clients to contact\n`);

  for (const client of clients) {
    if (!client.phone) {
      console.warn(`[Orchestrator] ⚠️  Skipping ${client.name} — no phone number`);
      continue;
    }

    await processClient(client);

    // Delay between calls to avoid spam detection
    if (clients.indexOf(client) < clients.length - 1) {
      console.log(`[Orchestrator] ⏳ Waiting ${config.server.callDelayMs / 1000}s before next call...`);
      await sleep(config.server.callDelayMs);
    }
  }

  console.log('\n[Orchestrator] ✅ All clients processed');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { runDialer, processClient };
