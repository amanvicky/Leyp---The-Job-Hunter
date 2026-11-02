# Leyp — Design Specification

**Status:** Draft for review
**Date:** 2026-11-02
**Author:** Design session
**Scope:** Six phases, one architectural contract

---

## 1. What this is

Leyp is a self-hosted job-search application for one person. You keep your career history in one profile; for each job you apply to, it reads the posting, shows how you match, drafts a tailored resume and cover letter using only facts from your profile, and tracks the application from draft to offer.

It runs on localhost on a Windows machine, stores everything in a local PostgreSQL database, and talks to an AI model of your choosing — a local one through Ollama, or any hosted provider.

### 1.1 The one rule that shapes everything

**A human approves every send.** Leyp never sends an application, an email, or a reply on its own. It prepares; you decide. This is a product decision, not a limitation, and it is enforced structurally rather than by convention:

- Agent-prepared drafts carry `awaitingReview = true` and are excluded from the applications list, board, dashboard and inbox until approved.
- Every outbound email passes through an explicit confirmation step that takes the message id.
- There is no code path from a scheduled job to a sent email.

### 1.2 What it is not

- Not multi-user. One password, one profile, one instance.
- Not a phone app. Desktop browser only.
- Not a scraper of sites whose terms forbid it. Sources are chosen for having a public API or explicit permission.
- Not autonomous. It does not apply to jobs for you.

---

## 2. Architectural decisions

These are settled. Later sections build on them; nothing later reopens them.

| # | Decision | Rationale |
|---|---|---|
| D1 | Next.js 16 App Router, React 19, TypeScript strict | Server Components keep secrets server-side by construction |
| D2 | Prisma 7 + PostgreSQL 18 | Real relational integrity for the 29-model domain; `db.test.ts` files run against real Postgres |
| D3 | PostgreSQL in Docker; the app runs natively on Node | Windows bind-mount file watching is slow; the DB is the only piece that benefits from a container |
| D4 | Contract-first walking skeleton | Phase 1 fixes every interface; phases 2–6 fill them without churn |
| D5 | Provider is a runtime value, all adapters present from phase 1 | The backend can be chosen in Settings at any time; no code changes |
| D6 | India-focused market | Sources, currency, locations and scoring tuned for INR/LPA and Indian cities |
| D7 | Localhost deployment, single instance | In-process timers are acceptable and documented |
| D8 | Every AI output is versioned and fact-checked | Provenance is stored; invented content is flagged before a human sees it |
| D9 | Strict mode on by default | "Never invent experience" is the default, not an option |
| D10 | No German Arbeitsagentur source | Its terms of use forbid automated access; excluded rather than shipped with a disclaimer |

### 2.1 Deviations from a pure-container design

Recorded explicitly so they are not rediscovered as surprises:

**D3a — argon2id via `@node-rs/argon2`, not `crypto.argon2`.** Node's built-in argon2 is newer than the Node release this targets. The native binding ships prebuilt Windows binaries, so no C++ toolchain is required. Parameters stay at OWASP's settings (m = 19456 KiB, t = 2, p = 1). Hash format remains `argon2id:m=<m>,t=<t>,p=<p>:<salt>:<hash>` — a custom format deliberately, because `.env` parsers expand `$`, which breaks the conventional `$argon2id$v=19$…` string.

**D3b — in-process timers run only while the app is open.** The nightly agent scan, nightly backup and update check are `setTimeout` loops inside the Next.js process. On a laptop this means they run when Leyp is running. Documented in the UI ("Scheduled tasks run while Leyp is open") and in the README. A single instance is enforced by a lock row in the database, not by convention.

**D3c — PDF rendering uses Playwright's Chromium natively.** `playwright-core` supplies the browser; no Docker needed. Rendering happens in a background job with a 30-second ceiling.

---

## 3. The two contracts

Every mutation and every route handler goes through one of these. They are the reason the security model holds, so they are implemented in phase 1 and never bypassed.

### 3.1 Server Actions

```ts
import { action, ActionError } from "@/lib/action";

export const renameTheme = action(
  z.object({ id: z.string(), name: z.string().trim().min(1, "Give the theme a name.") }),
  async ({ id, name }, { toast }) => {
    const theme = await prisma.theme.findUnique({ where: { id } });
    if (!theme) throw new ActionError("That theme no longer exists.");
    await prisma.theme.update({ where: { id }, data: { name } });
    toast(`Renamed to “${name}”.`);
    return { id, name };
  },
);
```

Returns `{ ok: true, data, toast? } | { ok: false, error, fieldErrors? }`. Guarantees:

1. The session is checked before the handler runs.
2. Input is parsed by the zod schema; a failure returns field-level errors, never an exception.
3. Unexpected errors are logged server-side **without their payload**, and the client receives a generic message.
4. `redirect()` and `notFound()` keep working because the wrapper re-throws Next.js control-flow errors.

### 3.2 Route handlers

```ts
export const GET = route<RouteContext<"/api/pdf/[id]">>(async (request, { params }) => {
  const { id } = await params;
  const pdf = await renderPdf(id);
  return new Response(pdf, { headers: { "content-type": "application/pdf" } });
});
```

Guarantees: session check (401), cross-origin rejection (403), `Cache-Control: private, no-store` unless the handler sets its own.

### 3.3 The audit test that makes them real

`src/lib/session-audit.test.ts` walks `src/app` and fails if any exported page, Server Action, or route handler does not go through `action()` / `route()` / `verifySession()`. Two exemptions, by name: the sign-in and sign-out routes.

Without this test the wrappers are a suggestion. With it, a new route that forgets auth cannot merge.

---

## 4. Data model

Twenty-nine models across nine areas. Conventions:

- **Key-value where the shape is a form.** `ProfileField(key, value)` and `Setting(key, value)` avoid a migration per field; typed access lives in one module.
- **Typed rows where the shape is a list.** Skills, roles, projects, education, publications, references are editable, reorderable and linked, so they get real tables with `sort`.
- **Text fields default to `""`, not null**, so forms autosave partial input without null checks.
- **JSON columns are zod-validated on read and write**; a row that fails validation is a bug, not a state.

### 4.1 Profile (11 models)

`ProfileField`, `Skill` (with `group`, citext-unique), `Language` (CEFR enum), `Experience`, `ExperienceSkill`, `Project`, `ProjectSkill`, `Education`, `Publication`, `Reference`, `Fact`.

`Fact` deserves a note: it holds something you tell the AI about yourself — either profile-wide or scoped to one application. Facts are **never printed on a document**; they are context for generation. This is how "I'm available from March" reaches a cover letter without appearing in your resume.

### 4.2 Themes and settings (2 models)

`Theme` carries 13 styling enums (fonts, layout, heading style, density, photo shape/position, date style). Six built-in themes are seeded with slug ids and are read-only; a database trigger prevents their deletion. `Setting` is key-value with a typed schema.

### 4.3 Applications (6 models)

```
Application
  status          DRAFT → SENT → SCREENING → INTERVIEW → OFFER → ACCEPTED/REJECTED/DECLINED
  furthestStage   the furthest funnel stage ever reached (monotonic)
  awaitingReview  agent draft, hidden everywhere until approved
  origin          MANUAL | AGENT
```

- `StatusEvent` records every transition **with the prior `furthestStage` and `sentAt`**, so undo is exact rather than approximate.
- `Document` holds `RESUME`, `COVER_LETTER` or `EMAIL` as structured *units*, not a blob — that is what makes targeted refine and trim-to-one-page possible. Unique on `(applicationId, kind)`.
- `DocumentVersion` snapshots units with a `VersionCause` (`WRITTEN`, `TRIMMED`, `REGENERATED`, `REFINED`, `UNDONE`, `BEFORE_RESTORE`, `RESTORED`), so nothing is lost and every change is attributable.
- `ChatMessage` stores the edits a refine turn made **with the previous text**, enabling per-message undo.
- `Note` is private to the application and never sent to a model.

Only `setStatus` may change an application's status. It writes the `StatusEvent`, keeps `furthestStage` monotonic, and maintains `sentAt` — the single place funnel figures can be corrupted, so it is the single place they are written.

### 4.4 Job search (3 models)

`Posting` (saved/dismissed/source-of-application), `PostingScore` (keyed by source+externalId so a score survives a re-search), `PostingSearch` (the query and results, so revisiting a search costs no API quota).

**Sources:** `ADZUNA`, `JSEARCH`, `FREEHIRE`. Each adapter maps its payload onto one shared `FoundPosting` shape.

**India specificity:**
- Locations default to Bangalore, Hyderabad, Pune, Chennai, Mumbai, Remote.
- `salary` stays as the source wrote it; `salaryMin`, `salaryMax` (Int, nullable) and `currency` (default `"INR"`) hold a best-effort normalized parse. Parsing recognises `₹`, `INR`, `LPA`, `lakhs`, `per annum`, ranges and `Negotiable`. When parsing fails the fields stay null and only the raw text is displayed — a wrong number is worse than no number.
- Filters use `employmentType` and a fresher-friendly band rather than years-of-experience alone.

### 4.5 Job agent (1 model)

`AgentCandidate` is a posting the agent found and scored, plus the draft it prepared.

- `dedupeKey` — a hash of the link with tracking parameters stripped, else of company+title+place — is **unique**, so the same job never surfaces twice across sources or runs.
- On dismissal the row is trimmed to ids, title, company and the fingerprint, so it stays out of future runs without retaining the description.
- Status: `SCORED → DRAFTING → DRAFTED → APPROVED | DISMISSED`. Claiming is done with a conditional `updateMany` on `status = SCORED`, so a double-click or a retry cannot produce two applications.

### 4.6 Startups (2 models)

`Startup` holds a company hiring post (YC job posts, Hacker News "Who is hiring?") with the email addresses it **published** — never guessed — each with where it was found. `StartupBlock` stores only a SHA-256 hash of a removed startup's identifying fields, so "remove and don't bring back" works without retaining the data.

Retention: unsaved startups expire after 45 days without being seen again; published addresses expire after 14 days unless an application was started; personally-looked-up addresses are never stored beyond that window.

### 4.7 Google (2 models)

`GoogleAccount` holds the refresh token **encrypted** under its own derived key, granted scopes, and the Gmail `historyId` cursor. `EmailMessage` holds mail about an application: direction, addresses, subject, body (quoted history stripped, capped), the classified `ReplyKind`, questions it asks, a suggested status, and a drafted reply with its gaps. `dismissedAt` keeps non-job mail out of the inbox without deleting it.

### 4.8 Sign-in (1 model)

`LoginThrottle` — one row per client IP plus a `"*"` global row — with a failure count, window start, and `blockedUntil`. Escalating backoff: 30 s, 60 s, 120 s, … capped at 15 minutes.

### 4.9 Background jobs (1 model)

`Job` — `type`, `key` (for reattachment), optional `applicationId` (cascade delete), `status`, the current `step` for progress display, `input` and `result` JSON, and a user-facing `error`.

Jobs are deleted with their application, and finished jobs are swept once older than the configured retention (1 h / 24 h / 7 d / 30 d, default 24 h). This is deliberate: job inputs contain postings and personal data.

---

## 5. The AI layer

### 5.1 Structure

```
src/lib/ai/
  index.ts               loadProvider() → Provider
  providers/
    openai.ts            OpenAI-compatible: DeepSeek, OpenRouter, Groq,
                         LM Studio, llama.cpp, OpenCode
    anthropic.ts         Anthropic messages API
    mistral.ts           Mistral
    ollama.ts            local Ollama
    servers.ts           per-vendor quirks, as data
  tasks/                 one module per task
  errors.ts              AiError with a human-readable message
```

### 5.2 The server-quirks table

The mechanism that keeps "decide the backend later" cheap. Vendor differences are data, not branches:

```ts
export type Server = {
  name: string;
  domain: string;
  path?: (p: string) => string;         // OpenRouter serves /api/v1, not /v1
  headers?: () => Record<string, string>;
  chat?: Record<string, unknown>;       // DeepSeek: disable thinking tokens
  ignoresSchemas?: true;                // Ollama Cloud: schema goes in the prompt
};
```

Adding a backend is one table entry plus one test case. `serverAt(baseURL)` matches on hostname (subdomains included), so one adapter serves many vendors.

### 5.3 Tasks

Each task is a module exporting a zod input schema, a prompt builder, an output schema, and a version string like `"tailor-resume@1"`. The version is persisted on whatever the task wrote (`extractedWith`, `writtenWith`, `matchedWith`, `scoredWith`, `classifiedWith`), so any stored text can be traced to the prompt that produced it.

| Task | Output | Phase |
|---|---|---|
| `extract-profile` | Profile rows from an uploaded PDF/DOCX/Markdown resume | 2 |
| `tailor-resume` | Resume units | 3 |
| `write-cover-letter` | Letter units, tone-aware | 3 |
| `write-email` | Application email body | 4 |
| `refine-chat` | Unit edits from a chat message | 3 |
| `regenerate-unit` | One rewritten section | 3 |
| `extract-posting` | Title, company, location, salary, requirements | 3 |
| `match-requirements` | Requirement-by-requirement fit with evidence | 3 |
| `score-posting` | 0–100, reasons, red flags | 5 |
| `classify-reply` | Rejection / interview / question / offer / acknowledgement | 6 |
| `draft-reply` | Answer, with the gaps it could not fill | 6 |

### 5.4 The fact guard

On by default ("Never invent experience"). After any generation it checks the output against the profile and the posting, and flags:

- **Skills** in the document that are not in the profile. `skills_ordered` must be a subset of `profile.skills`; anything else is a hard flag.
- **Employers, job titles and dates** not present in the profile.
- **Numbers** (metrics, percentages, team sizes, revenue) that appear in neither the profile nor the posting.
- **Named technologies** absent from both.

A flagged item does not silently disappear. It is surfaced next to the document with the exact phrase and its location, so the human reviewing it knows what to cut. Flags are stored with the document so a re-open shows the same warnings.

### 5.5 Prompt-injection posture

Job postings and incoming email are untrusted text written by strangers, and they enter prompts. The mitigations are structural:

- The model has **no tools** — it cannot read other data, browse, or mutate anything. It returns text.
- Output is rendered as **plain text, never HTML**, and schema-validated before storage.
- The fact guard catches fabricated claims the injection may have introduced.
- Drafted replies are never sent automatically; a suggested status change is a suggestion.

The worst a hostile posting achieves is odd wording in its own draft, or a wrong status suggestion a human declines.

### 5.6 Cost and quota control

Because free tiers are the likely starting point:

- Per-task token ceilings.
- Timeout: 300 s local, 120 s hosted.
- Retry with backoff on 429 and 529, once.
- **A single-call queue** — one AI request in flight at a time — so rapid clicking cannot burn a daily quota.
- When a model returns an answer that misses its schema twice, the failure is logged with the model and the offending field names, **never the answer**.

---

## 6. Security

| Area | Implementation |
|---|---|
| Sign-in | Single password, stored only as an argon2id hash in `APP_PASSWORD`; the server refuses to start if it is not a hash |
| Session | Encrypted JWT (JWE) in an HttpOnly, SameSite=Lax cookie, Secure over HTTPS; 24 h, or 30 d with "keep me signed in" |
| Session invalidation | Session carries a fingerprint of the password hash; changing the password or the secret ends every session |
| Authorization | `action()` / `route()` on every mutation and handler; `session-audit.test.ts` enforces it |
| CSRF | Next.js rejects cross-origin Server Actions; `route()` rejects cross-origin handlers |
| CSP | Per-request nonce; no external script origins; frame-ancestors none |
| Headers | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Permissions-Policy` on every response |
| Secrets | Each class encrypted under its own HKDF-derived key from `APP_SECRET`: `AI_KEY`, `JOB_SOURCE_KEY:*`, `GOOGLE_TOKEN`. Never sent to the browser, never logged |
| SSRF | Job-source fetches go only to fixed source addresses, with time and size limits. Posting links are fetched through a guarded fetcher that refuses private network ranges and cross-host redirects when a key is attached. Stored links must be `http(s)` |
| Errors | Unexpected errors logged server-side without payload; client gets a generic message |
| Rate limiting | Sign-in throttled per IP and globally |

Environment variables are validated by `src/lib/env.ts` at startup, which refuses to boot with a specific message naming the variable to fix. Server code reads from the validated `env` object, never from `process.env`.

---

## 7. Phases

Phase 1 ships no user-visible feature. It exists so phases 2–6 never have to change a shared interface.

### Phase 1 — Walking skeleton

**Builds:** the full Prisma schema (all 29 models, one migration), `src/lib/env.ts`, the sign-in flow, `action()` / `route()` / `getSession()` / `verifySession()`, `session-audit.test.ts`, the background job runner with named steps and reattachment, the AI provider registry with all four adapters and the quirks table, the HKDF secret module, the design system (tokens, layout frame, sidebar, nav), the Vitest + Playwright harness with fake AI / fake sources / fake Google servers, and seed data (six built-in themes, an empty profile, default settings, demo dataset behind a flag).

**Done when:** you can sign in, see an empty dashboard, and `npm test` runs unit, database and audit suites green.

### Phase 2 — Profile and resume

**Builds:** the nine profile models' editors (basics, skills with groups, languages with CEFR, experience with linked skills, projects, education, publications with bold/italic citation syntax, references, facts), the strength meter, resume import from PDF/DOCX/Markdown via `extract-profile`, the base resume preview, the six themes, a theme builder with live preview, and server-rendered PDF.

**Done when:** you can import your existing resume, edit it, pick a theme, and download a correct PDF.

### Phase 3 — Applications

**Builds:** new application from a pasted posting or URL, `extract-posting`, `match-requirements` with an evidence table, `tailor-resume` and `write-cover-letter`, the document unit editor, per-section regenerate, the refine chat with per-message undo, version history and restore, trim-to-one-page with the ability to put parts back, `setStatus` with funnel and undo, the board (drag and drop), the table, and the dashboard.

**Done when:** you can paste a posting and walk out with a tailored resume, cover letter and match report you would actually send.

### Phase 4 — Outbound email

**Builds:** Google OAuth (authorization code + signed `state`), encrypted token storage, `write-email`, the send flow with a mandatory confirmation step, thread linking, and send history on the application.

**Done when:** a confirmed application email sends from your Gmail and is recorded against the application.

### Phase 5 — Search and agent

**Builds:** the Adzuna, JSearch and FreeHire adapters with 30-minute caching and quota-aware failure messages, find-jobs UI with saved searches, `score-posting` with reasons and red flags, the nightly `agent-scan` → `agent-draft` pipeline with run caps and dedupe, per-platform daily caps, and the agent screen with approve/dismiss.

**Done when:** overnight, the agent scores new postings and prepares drafts that sit awaiting review.

### Phase 6 — Inbox, calendar, startups

**Builds:** Gmail inbox sync from the stored `historyId`, `classify-reply`, `draft-reply` with flagged gaps, suggested status changes a human accepts, Google Calendar free/busy and interview events kept in step with `nextInterviewAt`, the startups screen from YC and Hacker News, published-address extraction, and the retention sweeps.

**Done when:** a reply from an employer appears linked to its application with a drafted answer, and an interview time is on your calendar.

---

## 8. Testing

| Layer | Tool | What it covers |
|---|---|---|
| Unit | Vitest (node) | Pure logic: salary parsing, dedupe keys, fact guard, prompt builders, theme rendering |
| Component | Vitest + Testing Library (jsdom) | Components and hooks |
| Database | Vitest against real Postgres | `*.db.test.ts`, refusing any database whose name does not end in `_test`, each test emptying via `resetDatabase()` |
| Contract | Vitest | Every task's output schema against recorded fixtures; the fact guard against known-bad documents |
| Accessibility | Playwright + axe | Every screen, menu and dialog; no serious or critical WCAG 2.2 AA violations |
| End-to-end | Playwright | Sign-in, profile, themes and PDFs, new application, refine and undo, email, board, dashboard, export/import, agent, inbox |

**Fakes, not mocks of our own code.** A fake OpenAI-compatible server, fake job sources and a fake Google run on local ports and are pointed at by test-only environment variables. Your development data is never touched: the e2e harness refuses any database whose name does not end in `_e2e`.

**Coverage thresholds ratchet.** They sit a few points below current coverage and fail CI if coverage drops.

**Live tests are opt-in.** Real providers and real sources are exercised only when an environment flag names them, because they cost money and quota.

---

## 9. Operations

- **Startup:** `docker compose up -d db` then `npm run dev`. One documented command each.
- **Migrations:** `npx prisma migrate dev --name <name>`.
- **Backups:** nightly export of everything to a timestamped JSON file, retaining 14; plus documented `pg_dump` guidance, because the app's export is not a database backup.
- **Export/import:** everything (profile, themes, settings, applications with history and documents, notes, saved postings) as one JSON file. Import replaces all data in a single transaction after writing a safety backup. 10 MB cap.
- **Delete everything:** one action, with confirmation, that clears the database and the data directory.
- **Retention:** job data 1 h / 24 h / 7 d / 30 d (default 24 h); startups as in §4.6; mail bodies capped and stripped of quoted history.
- **Update check:** a daily request to a release endpoint, off by default.
- **Telemetry:** none. No usage ping, no install id, no outbound call except the sources, the AI provider, Google when connected, and the update check when enabled.

---

## 10. Honest limitations

1. **Scheduled work only runs while the app is open.** On a laptop that is most of the time not true. The nightly agent is a convenience, not a guarantee.
2. **One instance only.** Timers and the job runner assume a single process; a database lock enforces it. Running two copies will misbehave.
3. **PDF quality depends on Chromium.** Rendering matches the browser preview closely but not pixel-perfectly across platforms.
4. **The fact guard is a filter, not a proof.** It catches invented skills, employers, dates and numbers it can compare against the profile. It cannot catch a subtly wrong emphasis, and it does not check tone or taste. You still read every document before sending.
5. **Salary parsing is best-effort.** Indian postings write ranges in many forms; unparseable ones keep only the raw text.
6. **Source coverage is limited by what has an API.** Adzuna, JSearch and FreeHire cover a large slice, not everything. LinkedIn is deliberately not scraped.
7. **A local model is meaningfully worse** at cover-letter prose than a hosted one. The pipeline works; the writing is thinner.
8. **No multi-user, no sharing, no mobile.** By design.
9. **Chat history grows.** Refine messages are stored per application, and there is no pruning beyond delete-with-application.

---

## 11. Open questions

None blocking. Two deferred by explicit choice, with the design ready for either answer:

1. **AI provider** — to be chosen in Settings after phase 1. All four adapters ship; the choice is a settings row, not a code change.
2. **Whether to add Anthropic's prompt caching** — worth doing if Anthropic is chosen (profile text repeats across tasks), pointless for local models. Deferred until the provider is known.

---

## 12. Acceptance for the whole project

The six phases are complete when, on a fresh machine, following only the README:

1. `docker compose up -d db && npm install && npx prisma migrate dev && npm run dev` brings up a working app.
2. You can import your resume, produce a themed PDF, and fix a bad line by talking to the refine chat.
3. Pasting a posting produces a tailored resume, cover letter, and a match report whose every claim traces to your profile.
4. The fact guard flags an intentionally fabricated skill when one is injected into a draft.
5. A confirmed email sends from your Gmail and appears on the application's timeline.
6. An overnight agent run produces scored candidates and drafts that are invisible on the applications list until approved.
7. An employer's reply appears linked to its application with a drafted answer awaiting your confirmation.
8. `npm test` and `npm run test:e2e` pass from a clean checkout.
