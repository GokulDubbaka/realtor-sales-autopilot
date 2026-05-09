'use strict';
/**
 * ADB Service — controls the Android phone via USB debugging.
 *
 * SECURITY NOTE:
 * All phone numbers are validated against a strict E.164-style allowlist
 * before being passed to the shell. This prevents shell injection from
 * malformed lead data coming from Google Sheets.
 */
const { execFile } = require('child_process');
const config = require('../config');

const ADB = config.adb.path;

// ─── Strict phone number validator ──────────────────────────────
// Only allows digits, +, spaces, hyphens, parentheses.
// Rejects anything else before it ever touches a shell command.
const PHONE_RE = /^[\d+()\-\s]{5,20}$/;

function validatePhone(rawNumber) {
  const clean = String(rawNumber).replace(/\s+/g, '');
  if (!PHONE_RE.test(clean)) {
    throw new Error(`Invalid phone number rejected for security: "${rawNumber}"`);
  }
  return clean;
}

// ─── Utility: run ADB command safely via execFile (no shell) ─────
// execFile does NOT spawn a shell — args are passed directly to the
// OS, so shell metacharacters in arguments have no special meaning.
function adb(args) {
  const deviceArgs = config.adb.device ? ['-s', config.adb.device] : [];
  const allArgs = [...deviceArgs, ...args];
  return new Promise((resolve, reject) => {
    execFile(ADB, allArgs, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout.trim());
    });
  });
}

// ─── Check ADB device is connected ──────────────────────────────
async function checkDevice() {
  try {
    const output = await adb(['devices']);
    const lines = output.split('\n').filter(l => l.includes('device') && !l.includes('List'));
    if (lines.length === 0) {
      throw new Error(
        'No Android device detected via ADB.\n' +
        '→ Connect Poco C61 via USB\n' +
        '→ Enable USB Debugging (Settings → Additional Settings → Developer Options)\n' +
        '→ Tap "Allow" on the phone when prompted'
      );
    }
    const deviceId = lines[0].split('\t')[0];
    console.log(`[ADB] ✅ Device connected: ${deviceId}`);
    return deviceId;
  } catch (e) {
    throw e;
  }
}

// ─── Initiate outbound call via Android dialer ──────────────────
async function makeCall(phoneNumber) {
  if (config.server.dryRun) {
    console.log(`[ADB][DRY-RUN] Would call: ${phoneNumber}`);
    return true;
  }

  // Validate and sanitise — throws if input is not a valid phone number.
  const clean = validatePhone(phoneNumber);

  // Pass args as an array to execFile — no shell interpolation occurs.
  await adb(['shell', 'am', 'start', '-a', 'android.intent.action.CALL', '-d', `tel:${clean}`]);
  console.log(`[ADB] 📞 Call initiated to ${phoneNumber}`);
  return true;
}

// ─── End / hang up active call ───────────────────────────────────
async function endCall() {
  if (config.server.dryRun) {
    console.log('[ADB][DRY-RUN] Would hang up call');
    return;
  }
  await adb(['shell', 'input', 'keyevent', '6']);
  console.log('[ADB] 📵 Call ended');
}

// ─── Get current call state ──────────────────────────────────────
async function getCallState() {
  try {
    const output = await adb(['shell', 'dumpsys', 'telephony.registry']);
    const match = output.match(/mCallState=(\d)/);
    if (!match) return 'IDLE';
    const states = { '0': 'IDLE', '1': 'RINGING', '2': 'ACTIVE' };
    return states[match[1]] || 'IDLE';
  } catch {
    return 'IDLE';
  }
}

// ─── Poll call state until connected or timed out ────────────────
async function waitForCallConnect(timeoutMs = 35000) {
  const startTime = Date.now();
  let wasRinging = false;

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const state = await getCallState();

      if (state === 'RINGING') wasRinging = true;

      if (state === 'ACTIVE') {
        clearInterval(interval);
        resolve({ result: 'ACTIVE', elapsed });
      } else if (state === 'IDLE' && wasRinging) {
        clearInterval(interval);
        resolve({ result: 'NO_ANSWER', elapsed });
      } else if (elapsed > timeoutMs) {
        clearInterval(interval);
        await endCall().catch(() => {});
        resolve({ result: 'TIMEOUT', elapsed });
      }
    }, 1000);
  });
}

// ─── AMD: Monitor how long call stays active ─────────────────────
async function detectAnswerType(connectedAt) {
  const threshold = config.adb.amdVoicemailThresholdMs;

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      const state = await getCallState();
      const duration = Date.now() - connectedAt;

      if (state === 'IDLE') {
        clearInterval(interval);
        resolve(duration < threshold ? 'VOICEMAIL' : 'CALL_ENDED');
      }
    }, 500);
  });
}

// ─── Send DTMF tone ───────────────────────────────────────────────
async function sendDTMF(digit) {
  const keycodes = {
    '0': 7, '1': 8, '2': 9, '3': 10, '4': 11,
    '5': 12, '6': 13, '7': 14, '8': 15, '9': 16,
    '*': 17, '#': 18
  };
  const code = keycodes[digit];
  if (code) await adb(['shell', 'input', 'keyevent', String(code)]);
}

module.exports = {
  checkDevice,
  makeCall,
  endCall,
  getCallState,
  waitForCallConnect,
  detectAnswerType,
  sendDTMF,
};
