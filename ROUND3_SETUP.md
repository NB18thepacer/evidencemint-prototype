# EvidenceMint Round 3 setup

This prototype keeps the existing Groq review endpoint and adds three Round 3 improvements: optional web research with source links, versioned approved facts/guidelines with expiry, and a shared role-based team workspace.

## One-time setup

1. Create a Supabase project. In **SQL Editor**, open `supabase/schema.sql`, paste the whole file, and run it once.
2. In Supabase **Project Settings → API**, copy the Project URL, anon/public key, and `service_role` key.
3. In Vercel **Project → Settings → Environment Variables**, add these values for **Production** and **Preview**:

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | Supabase Project URL |
   | `SUPABASE_ANON_KEY` | Supabase anon/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` key; keep private |
   | `TEAM_JOIN_CODE` | A private code for creator accounts |
   | `REVIEWER_JOIN_CODE` | A different private code for reviewer accounts |
   | `ADMIN_JOIN_CODE` | A different private code for admin accounts |

   Keep `GROQ_API_KEY` in Vercel only. Never add any of these values to GitHub, browser code, screenshots, or chat.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to `https://evidencemint-prototype.vercel.app`. Add that exact URL to the allowed redirect URLs. For a quick event prototype, turn off email confirmation so a newly created account can immediately join with its invite code; turn it back on after the event if keeping the project.
5. `vercel.json` gives the Groq web-search function up to 60 seconds on the Vercel Hobby plan. Commit and push the files in this folder. Vercel should deploy from `main`. If the environment variables were added after the last deployment, redeploy once.

## Team accounts

- Open the deployed site and enter the workspace. Select **Team sign in → Create account**, use a unique email/password, choose the role, and enter the matching invite code shared privately by the team admin.
- Use **Creator** for people who submit drafts, **Reviewer** for the person who makes final approve/return decisions, and **Admin** for the person who maintains approved facts and guidelines. Admins do not make review decisions.
- Each teammate must create their own account. The role selector is disabled after sign-in; the server checks permissions so only Reviewers can approve/return drafts and only Admins can add or version approved records.
- Do not submit real confidential company material in this public hackathon prototype. This is a small event build, not a security-audited production service.

## Product workflow

1. Creator pastes article text or uploads a text-based PDF. Text extraction happens in the browser; the PDF file itself is not uploaded to Groq or Supabase.
2. Groq checks the extracted text against the fictional starter rules and, when signed in, the latest non-expired approved team facts/guidelines. Findings must cite a rule or versioned record ID.
3. Creator can run **Research claims on the web**. Groq Browser Search returns dated research text and direct source links. Open sources and check them; search results are advisory and can be incomplete.
4. Creator sends the exact version to the shared reviewer inbox. A reviewer can approve it or return it with a reason. Editing creates a new version, so approval does not carry forward.

## Important boundaries

- The 150 starter guidelines are fictional demonstration content. Real organisations must supply and maintain their own approved rules and facts.
- AI review is not legal advice. External web research is not represented as a verified truth verdict.
- PDF extraction currently handles selectable text; scanned PDFs need OCR, which is not included in this focused build.
- Review data is shared within the Team NAS workspace after sign-in. Sign out to return to browser-local demo mode.
