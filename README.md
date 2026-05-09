# 🔧 Realtor Sales Autopilot — Zero-Subscription Outbound Engine

> **Status:** Working automation system · ADB call routing functional · Google Sheets + Email integrated

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 18+](https://img.shields.io/badge/node-18+-green)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## 🎯 What This Is

A **zero-subscription outbound sales automation system** for Indian real estate agents. Uses an Android phone (via ADB) as the call gateway — no expensive VoIP subscriptions, no third-party dialers. Built for solo agents and small teams managing 50–200 daily lead calls.

**Core flow:**
```
Google Sheets (leads) → Orchestrator → ADB call → 
  ├── Human answered → Agent screen pop on dashboard
  ├── No answer → Voicemail → WhatsApp follow-up
  └── Voicemail detected → Email follow-up + next-call schedule
```

---

## ✅ What Actually Works

| Feature | Status |
|---------|--------|
| ADB call initiation (Android phone as gateway) | ✅ Working |
| Google Sheets lead ingestion | ✅ Working |
| Call state machine (ring/answer/no-answer/voicemail) | ✅ Working |
| Gmail SMTP follow-up emails | ✅ Working |
| WhatsApp Cloud API follow-ups | ✅ Working (requires Meta approval) |
| Real-time manager dashboard (WebSocket) | ✅ Working |
| Agent screen pop on incoming connection | ✅ Working |
| Config validator (`npm run validate`) | ✅ Working |
| Dry-run simulation (`npm run simulate`) | ✅ Working |

---

## ❌ What We Have NOT Yet Achieved

### 1. True AMD (Answering Machine Detection)
Current voicemail detection is heuristic-based (call duration + silence detection). Professional-grade AMD using audio fingerprinting or ML requires the call audio stream — which ADB does not expose.

### 2. Spam Tag Avoidance
High-volume calling from a single number leads to spam tagging by carriers. No CNAM (Caller ID Name) management or number rotation is implemented.

### 3. WhatsApp Without Meta Approval
The Meta WhatsApp Business API requires business verification (typically 2–4 weeks). Until then, WhatsApp messages are skipped — the system falls back to email only.

### 4. Multi-Agent Routing
The hunt group currently calls Agent 1, then Agent 2, sequentially. No skill-based routing or load balancing across concurrent calls.

---

## 🚀 Quick Start

```bash
git clone https://github.com/GokulDubbaka/realtor-sales-autopilot.git
cd realtor-sales-autopilot
npm install
cp setup.env.template .env        # fill in your credentials
npm run validate                  # check all configs
npm run simulate                  # dry run (no real calls)
npm start                         # live mode — requires connected Android device
```

**Android setup:** Connect Poco C61 (or any Android 9+) via USB, enable USB debugging, set `ADB_PATH` in `.env`.

---

## 🤝 How You Can Help

- **Real AMD:** Integrate Twilio's AMD API or a local audio classifier for accurate voicemail detection
- **Call recording:** Capture and transcribe call audio for CRM notes (requires audio access beyond ADB)
- **CRM integrations:** Push lead status to HubSpot / Zoho CRM automatically
- **Multi-number rotation:** Rotate outbound caller IDs to reduce spam tagging
- **iOS support:** Extend beyond ADB to support iPhone call initiation (Shortcuts API)

---

## 📄 License

MIT — see [LICENSE](LICENSE)
