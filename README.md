# EvidenceMint prototype

Desktop-first, no-build static web prototype for the NAS EvidenceMint project. It contains a product landing page and an interactive Creator / Reviewer workspace.

## Open the prototype

Open `index.html` in a modern browser. For the most reliable PDF preview behavior, serve this folder with any simple local static server. No npm install or API key is needed.

## What works

- Landing page with links into the workspace.
- Creator and Reviewer role switcher; no login required.
- Draft title, creator intent, pasted article text, and PDF attachment selection.
- Fixed 150-rule fictional guideline pack, grouped into 15 topics and searchable in the UI.
- A clearly labelled phrase-matching sample review for the fictional Northstar Demo Co. article.
- Finding cards with demo statuses and evidence references.
- Creator revision, version increment, human challenge, reviewer inbox, reviewer return or approval.
- Approval appears as **Approved — ready to publish** and applies to that exact version.
- Draft workflow is saved in the current browser's local storage.

## Not connected yet

This prototype has no AI API, live web search, PDF text extraction/OCR, remote database, multi-user sync, or CMS publishing. The demo checker matches only a few known phrases. It does not interpret the 150 guidelines or verify arbitrary article claims. Use only fictional/demo content until the next integration phase is built.

The guideline pack is in `guidelines.js`; replace it with reviewed organization-specific rules before using AI against real content. The AI orchestration and API secrets should be added on a server-side endpoint in the next phase, never in browser JavaScript.

## Files

- `index.html` — landing page and workspace structure.
- `styles.css` — responsive visual system and components.
- `app.js` — local demo workflow and state transitions.
- `guidelines.js` — 150 fictional sample rules.
