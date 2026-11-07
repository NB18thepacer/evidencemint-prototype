# EvidenceMint — prototype handoff

## Product

EvidenceMint is a pre-publication review workspace for organisations. A creator submits an article PDF and explains its intent. The planned AI checks article claims against a fixed company guideline pack, researches relevant public facts with citations, and returns clear finding cards and optional revisions. The creator can revise or challenge a finding. A human reviewer reviews the evidence and either approves that exact version as **ready to publish** or returns it with a reason. The prototype does not publish to an external CMS.

## Decisions agreed with the team

- Product name: EvidenceMint. Team: NAS.
- Landing page plus interactive app workspace.
- Preserve the existing orange / cream / navy identity while borrowing the attached reference's spacing, typography contrast, cards, and visual rhythm.
- Desktop-first, with responsive mobile layouts.
- No login in the demo; use a Creator / Reviewer role switcher.
- Use a fictional fixed guideline pack of 150 rules across 15 topics. Keep it as local project data, not a live database or Admin-managed system.
- Creator input: PDF, article purpose / intent, and article text during the no-AI prototype.
- Approval is attached to the reviewed version and means “ready to publish”.
- AI and web search integration happen only in the next phase.

## What exists now

- `index.html`: landing page and app shell.
- `styles.css`: styling and responsive layouts.
- `app.js`: local browser workflow and state changes.
- `guidelines.js`: 150 fictional starter rules.
- `README.md`: open/run instructions and limitations.

The prototype supports local draft creation, a PDF file-name attachment, a few explicitly labelled phrase-match sample findings, version increments, challenges, reviewer inbox, return with a reason, approval, guideline search, and browser-local persistence. This is a UI/workflow prototype; sample findings are not real analysis.

## Limitations before AI integration

- No AI API call or server-side orchestration.
- No real guideline reasoning or semantic claim checking.
- No web search or live source verification.
- PDF contents are not extracted; paste text to use the sample phrase matcher.
- No remote database or team sync; state stays in that browser.
- No external CMS publishing.

## Next phase: AI integration

1. Review and finalise the fictional 150-rule pack, with stable IDs, categories, severity, and source metadata.
2. Add server-side PDF extraction (plus OCR if scanned PDFs are in scope) and document limits.
3. Implement a backend review endpoint. Keep provider keys on the server; the browser must not contain secrets.
4. Have the model return schema-validated claim findings, exact guideline IDs, evidence excerpts, confidence / uncertainty, and optional intent-preserving suggestions.
5. Add web search as a separate evidence source. Preserve URL, publisher, date, and excerpt; do not let web text silently overwrite approved company facts.
6. Store draft versions, findings, creator challenges, reviewer rationale, and approval in a real database when multi-user access is required.
7. Evaluate against a labelled test set and disclose limitations; measure false flags, missed issues, source quality, and reviewer agreement before presenting effectiveness claims.

The exact AI provider, web-search provider, database/hosting, security model, and real company guideline source still need to be selected before integration.
