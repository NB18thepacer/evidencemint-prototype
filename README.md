# EvidenceMint

**Pre-publication content review, grounded in approved evidence and decided by people.**

EvidenceMint helps marketing and product teams review article claims before publication. Creators submit text or a text-based PDF, see guideline findings linked to rule IDs, optionally research factual claims on the web, and send a specific draft version to a human reviewer.

## Round 3 improvements

1. **Claim research:** Groq Browser Search gathers dated public-source evidence for factual claims. Sources are linked for people to inspect; this is not a guarantee of truth.
2. **Versioned approved information:** Admins can add company facts and guidelines with stable keys, source URLs and expiry dates. Updates create a new version. Expired latest versions are excluded from AI review.
3. **Shared role-based workflow:** Supabase Auth and database storage let teammates share reviews. Creators submit drafts, Reviewers alone make final approve/return decisions, and Admins maintain approved records.

## Main workflow

1. Creator signs in or uses the local demo, adds article text/PDF and explains the intent.
2. The browser extracts selectable PDF text. The server sends text to Groq for review against the 150 fictional starter guidelines and, for signed-in users, current approved company records.
3. The creator reviews source-linked flags and can run an optional web research step for factual claims.
4. The creator submits that exact version to the reviewer. The reviewer approves it as ready to publish or returns it with a reason.
5. Editing makes a new version and clears prior approval. EvidenceMint does not publish to a CMS.

## Live prototype capabilities

- AI guideline review through the server-side Groq endpoint
- Text extraction from selectable-text PDFs in the browser
- Claims & Evidence Ledger with cited guideline or approved-record IDs
- Web-search research action with direct links and research timestamp
- Team accounts, workspace invitations and creator/reviewer/admin roles (when Supabase is configured)
- Shared draft and reviewer-decision workflow (when signed in)
- Admin-managed approved fact/guideline records with version history, source and expiry metadata
- Browser-local demo mode when not signed in

## Boundaries

- The 150 starter guidelines are fictional demonstration content. Replace them with an organisation's reviewed rules and facts before any real use.
- AI and web research can be wrong or incomplete. Human reviewers remain responsible for decisions.
- Scanned PDF OCR is not included; use a PDF with selectable text or paste the text.
- This is a hackathon prototype, not a security-audited service. Do not upload confidential real-company material.

## Stack

- HTML, CSS and vanilla JavaScript
- Vercel serverless functions for Groq calls and permission-checked workspace operations
- Groq `openai/gpt-oss-20b` for guideline review and built-in Browser Search
- Supabase Auth and Postgres for shared team accounts, reviews and versioned approved records
- PDF.js in the browser for selectable PDF text extraction

The Groq key and Supabase service-role key must remain in Vercel environment variables. Never put them in client-side code or commit them to the public repository.

## Setup and deployment

Follow [ROUND3_SETUP.md](ROUND3_SETUP.md) for Supabase SQL setup, Vercel variables, authentication settings, and team invite-code setup. The Vercel project should deploy from the repository root, with this folder's files at that root.

## Repository files

```text
index.html
styles.css
app.js
guidelines.js
api/health.js
api/config.js
api/review.js
api/research.js
api/cloud.js
supabase/schema.sql
ROUND3_SETUP.md
```

## Team

**Team NAS**

- Amitheswar M — Team Leader
- Naveen Babu R
- Sri Sachin D P

The team used AI coding assistance during development and should understand and disclose the implementation process in line with the event rules.
