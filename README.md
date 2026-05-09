<div align="center">

# 📞 Realtor Sales Autopilot

**Zero-subscription outbound sales automation using your Android phone as a gateway.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=nodedotjs)](https://nodejs.org)
[![ADB](https://img.shields.io/badge/Android-ADB%20Powered-brightgreen?logo=android)](https://developer.android.com/tools/adb)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![No Subscription](https://img.shields.io/badge/Cost-Zero%20Subscription-gold)]()

*No Twilio. No per-minute charges. Just your phone + ADB + Node.js.*

[Features](#-features) · [How It Works](#-how-it-works) · [Quick Start](#-quick-start) · [Configuration](#-configuration) · [Architecture](#-architecture)

</div>

---

## ✨ Features

- 📱 **ADB-powered calling** — Uses your real Android phone (via USB) to place actual cellular calls — zero per-minute cost
- 🤖 **Answering Machine Detection (AMD)** — Automatically detects voicemail vs. human answer using call duration heuristics
- 🔁 **Sequential Hunt Group** — Calls Agent 1 → Agent 2 → ... until someone answers
- 📊 **Google Sheets CRM** — Reads leads from and writes call outcomes to a Google Sheet — no database needed
- 📩 **Automated fallback** — Sends WhatsApp Cloud API message + Gmail email if all agents miss the call
- 🖥️ **Live Dashboard** — Real-time call status panel for managers (Node.js express server)
- 🔁 **Dry-run mode** — Full simulation without placing real calls (default: `DRY_RUN=true`)

---

## 🔧 How It Works

```
Google Sheets (Lead List)
        ↓
  Pull next lead
        ↓
  ADB → Android phone → Real cellular call
        ↓
  AMD heuristic (call duration)
        ↓
  ┌─────────────────────────────────────────┐
  │ Human answered?  → Connect to Agent     │
  │ Voicemail?       → Send WA + Email      │
  │ No answer?       → Send WA + Email      │
  └─────────────────────────────────────────┘
        ↓
  Log outcome → Google Sheet (Call Log tab)
```

---

## ⚡ Quick Start

### Prerequisites

- **Node.js 18+**
- **Android phone** connected via USB with ADB enabled
- **ADB Platform Tools** (download [here](https://developer.android.com/tools/releases/platform-tools))
- **Google Service Account** with Sheets API enabled ([guide](https://developers.google.com/sheets/api/quickstart/nodejs))

### Install

```bash
git clone https://github.com/YOUR_USERNAME/realtor-sales-autopilot.git
cd realtor-sales-autopilot

npm install

# Copy the env template and fill in your values
cp setup.env.template .env
# Edit .env — see Configuration section below
```

### Authorize Your Android Device

```bash
# List connected devices
./platform-tools/adb devices

# Should show your device serial number
# If unauthorized: check your phone screen and tap "Allow"
```

### Validate Setup (Dry Run)

```bash
node scripts/validate.js
```

### Run a Simulation

```bash
node scripts/simulate.js
```

### Start the Bot

```bash
node src/index.js
```

---

## ⚙️ Configuration

Copy `setup.env.template` to `.env` and fill in:

| Variable | Description |
|---|---|
| `ADB_PATH` | Path to `adb.exe` (e.g. `./platform-tools/adb.exe`) |
| `ADB_DEVICE` | Your device serial (from `adb devices`) |
| `AGENT_1_NAME` | First agent's name |
| `AGENT_1_PHONE` | First agent's phone number (`+91XXXXXXXXXX`) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Service account private key (from JSON file) |
| `GOOGLE_SPREADSHEET_ID` | Google Sheet ID from the URL |
| `META_WA_PHONE_NUMBER_ID` | WhatsApp Cloud API phone number ID |
| `META_WA_ACCESS_TOKEN` | WhatsApp Cloud API access token |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail App Password (not your regular password) |
| `DRY_RUN` | `true` = simulate only, `false` = real calls |

> **Security:** Never commit your `.env` file. It is listed in `.gitignore`.

### Google Sheet Structure

Your sheet should have these tabs:
- **Clients** — Lead list with columns: `Name`, `Phone`, `Status`
- **Missed Calls** — Auto-populated by the bot
- **Call Log** — Full call history with timestamps and outcomes

---

## 🗂️ Architecture

```
realtor-sales-autopilot/
├── src/
│   ├── index.js              # 🚀 Entry point — main orchestration loop
│   ├── config.js             # Environment config loader
│   ├── core/                 # ADB caller, AMD logic, hunt group
│   ├── services/             # Google Sheets, WhatsApp, Email services
│   └── dashboard/            # Live manager dashboard (Express)
├── scripts/
│   ├── simulate.js           # Full dry-run simulation
│   └── validate.js           # Environment validation checker
├── setup.env.template        # Environment variable template
└── platform-tools/           # ADB binaries (not committed to git)
```

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📄 License

MIT — see [LICENSE](LICENSE)
