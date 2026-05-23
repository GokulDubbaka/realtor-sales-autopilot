# 🔧 Realtor Sales Autopilot — Zero-Subscription Outbound Engine

> **Status:** Working automation system · ADB call routing functional · Google Sheets + Email integrated

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 18+](https://img.shields.io/badge/node-18+-green)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## 🎯 What This Is

A **zero-subscription outbound sales automation system** for Indian real estate agents. Uses an Android phone (via ADB) as the call gateway — no expensive VoIP subscriptions, no third-party diallers, no SaaS fees.

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

## 📄 License

MIT — see [LICENSE](LICENSE)
