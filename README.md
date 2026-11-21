<!--
  TODO BEFORE 1:15 PM:
  [ ] Paste the real .workers.dev + video links      [ ] Add screenshots/dashboard.png + screenshots/report.png
  [ ] Repo is PUBLIC                                  [ ] Last commit before 1:30 PM
-->
# Coding with Color Impact Hub

**Team:** Pranit (solo) · **Nonprofit:** Coding with Color
**Live app:** https://[your-worker].[your-subdomain].workers.dev
**Video (3 min):** [unlisted YouTube / Drive link]

## The problem
Coding with Color teaches coding to students of color. Students quietly drift away between sessions, and staff often don't notice until it's too late to bring them back. The organization also struggles to show donors the impact of its programs, because attendance, skill growth and student stories are scattered across spreadsheets and memory.

## How it works
- **Take attendance in one tap per student.** Attendance %, days since last session, and skill growth are calculated automatically.
- **"Needs attention" on the dashboard** flags students who are slipping (14+ days away or under 60% attendance in red; 7+ days or under 75% in orange) with the reason, so a mentor can reach out the same day. An optional ✨ button drafts a friendly, no-guilt check-in text.
- **Donor report, one click:** students served, retention, attendance, learning hours, skill levels gained and projects shipped, broken down by program, plus student quotes. Names are never shown, and quotes appear only after the family OKs sharing. Print it or save it as a PDF, or let ✨ draft a donor update from the live numbers.
- Everything exports to CSV, so the data is never locked in.

![Dashboard](screenshots/dashboard.png)
![Donor report](screenshots/report.png)

## Tech stack
- Single-page app: HTML, CSS and vanilla JavaScript in one file (`src/index.html`), no framework, no UI build step
- **Cloudflare Workers** serves the app and a small REST API; **Workers KV** stores shared data (falls back to browser localStorage if KV isn't bound)
- **Workers AI** (`@cf/meta/llama-3.1-8b-instruct`) for the donor-update and check-in drafts. AI is called only from the Worker, through an allowlist of fixed prompts, and is rate-limited
- `build/build_worker.py` bundles `src/index.html` into the single deployable `worker.js`
- **AI assistance and starter template disclosure:** we began from a generic, config-driven starter template that Pranit prepared before the event (`src/presets/`, `build/`). The Coding with Color app (config, risk rules, attendance flow, donor report, AI actions) was built during the hackathon, with Claude as architect/reviewer and Codex implementing well-specified pieces, all reviewed and tested.

## How to run it
- **Use it:** open the live link above.
- **Run locally:** open `src/index.html` in a browser (works offline; data stays in that browser), or `npm install && npm run dev`.
- **Deploy:** `npm run deploy` (needs `npx wrangler login`; bindings are in `wrangler.toml`).
- **Tests:** `node tests/test_attention.mjs` and `node tests/test_t2_ai_actions.mjs` (after `python3 build/build_worker.py`).
- **Adapt it:** everything the app tracks lives in the `CONFIG` block of `src/index.html` (source: `src/presets/coding_with_color.js`).

## Status
**Finished:** student records with automatic attendance %, days away and skill growth; one-tap attendance; risk flags and the "Needs attention" list; impact dashboard and charts; printable donor report with consent-gated stories; CSV import/export; AI drafts for donor updates and check-ins (when Workers AI is enabled).
**Mocked up / demo only:** all students, mentors and quotes are fake; check-in texts are drafted, not sent; skill levels (1-5) are entered by mentors.
**Next:** mentor logins and per-mentor views; real SMS/email check-ins; term-over-term comparison for donors; import from their existing attendance spreadsheets.

## Privacy note
The demo uses fake data only. A real deployment would need staff logins, access controls and encryption before storing information about real students, and parental consent rules for anything shared outside the organization.

## License
MIT. See `LICENSE`.
