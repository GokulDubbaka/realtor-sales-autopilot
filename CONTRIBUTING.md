# Contributing to Realtor Sales Autopilot

Thank you for your interest!

## Ground rules

- All phone numbers in templates must be placeholders (e.g., `+91XXXXXXXXXX`).
- Never commit `.env` files — use `setup.env.template` as the reference.
- `DRY_RUN=true` must be the default in any template or example.
- Follow the Node.js code style already in the project.

## How to contribute

1. **Fork** the repository
2. **Create a branch** — `git checkout -b feat/my-feature`
3. **Install** — `npm install`
4. **Test your changes** — `npm run simulate` (dry-run mode)
5. **Open a Pull Request** against `main`

## Reporting issues

Open a GitHub Issue with steps to reproduce.

## ⚠️ Legal / Safety

This system initiates outbound phone calls. Never run in live mode against phone numbers you do not have authorization to contact. Respect local telemarketing and TRAI regulations.
