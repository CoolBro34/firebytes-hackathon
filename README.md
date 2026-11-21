<!--
  TODO BEFORE 1:30 PM (delete this comment when done; it's invisible on GitHub anyway):
  [ ] Replace every [BRACKETED] item below            [ ] Add 1-2 screenshots to /screenshots and fix the image paths
  [ ] Paste the real video + .workers.dev links       [ ] "Finished / Mocked up / Next" is honest
  [ ] Repo is PUBLIC                                   [ ] Last commit is before 1:30 PM
-->
# [PROJECT NAME]

**Team:** [names] · **Nonprofit:** [nonprofit name]
**Live app:** https://[your-worker].[your-subdomain].workers.dev
**Video (3 min):** [unlisted YouTube / Drive link]

## The problem
[2-3 sentences: who the nonprofit serves, what hurts today, what it costs them.]

## How it works
[2-3 sentences about the main flow. Example: "Staff add volunteers and shifts. The dashboard shows open spots and flags shifts that are understaffed soon. Everything exports to CSV."]

![Dashboard](screenshots/dashboard.png)
![Main screen](screenshots/main.png)

## Tech stack
- Single-page app: HTML, CSS and vanilla JavaScript in one file (`src/index.html`), no framework and no build step for the UI
- Cloudflare Workers hosts it and provides a small REST API; Cloudflare KV for shared storage [or: browser localStorage]
- `build/build_worker.py` bundles `src/index.html` into the single deployable `worker.js`
- Built with AI assistance (Claude). We began from a generic, config-driven starter template (included here: `src/presets/`, `build/`) and built the project for this nonprofit during the hackathon.

## How to run it
- **Use it:** open the live link above.
- **Run locally:** open `src/index.html` in a browser (works offline, data stays in the browser), or `npm install && npm run dev` and open the URL it prints.
- **Deploy:** `python3 build/build_worker.py`, then paste `worker.js` into a Cloudflare Worker (Edit code → Deploy), or `npm run deploy`.
- **Change what the app tracks:** edit the `CONFIG` block at the top of `src/index.html` (entities, fields, seed data, theme), or apply a preset: `python3 build/apply_preset.py src/presets/pantry.js`.

## Status
**Finished:** [what truly works, e.g. add/edit/delete, search, dashboard, CSV export]
**Mocked up / demo only:** [e.g. all data is fake; reminders are not actually sent]
**Next:** [e.g. staff logins, real text reminders, multi-site support]

## Privacy note
The demo uses fake data only. A real deployment would need user accounts, access controls and encryption before storing information about real people.

## License
MIT. See `LICENSE`.
