# Leyp — The Job Hunter

[![CI](https://github.com/amanvicky/leyp/actions/workflows/ci.yml/badge.svg)](https://github.com/amanvicky/leyp/actions/workflows/ci.yml)

A self-hosted, single-user, human-in-the-loop job-search application. Core rule: **the human approves every send.**

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Prisma 7 — 29 models across profile, applications, postings, agent, inbox and Google integration (SQLite datasource + better-sqlite3 adapter)
- zod, `@node-rs/argon2`, `jose` (JWE sessions)
- Vitest (unit + DB + contract), Playwright (E2E)
- AI: OpenAI, Anthropic, Mistral, Ollama (local)

## Features

- **Profile & resume** — experience, projects, skills, education, publications, references; 6 themes, PDF export, resume import
- **Applications** — paste a posting → extracted requirements → match report → tailored resume + cover letter → refine chat with undo → version history
- **AI tasks** — match-requirements, tailor-resume, write-cover-letter, write-email, refine-chat, score-posting, classify-reply, draft-reply
- **Job search** — Adzuna, JSearch, FreeHire adapters with 30-min caching and quota-aware failures
- **Agent** — nightly scan scores postings, surfaces candidates for approve/dismiss
- **Inbox** — Gmail sync, reply classification, draft replies with flagged gaps
- **Startups** — startup list with roles and published addresses
- **Google** — OAuth, encrypted token storage, Calendar free/busy + interview events

## Running

```bash
cp .env.example .env.local  # or create manually
# Required: APP_PASSWORD (argon2id hash), APP_SECRET (>=32 chars), DATABASE_URL
npm install
npm run db:up              # starts the Postgres container the example .env points at
npx prisma migrate deploy
npx tsx scripts/seed.ts
npm run dev
```

Dev server: http://localhost:3000

## Testing

```bash
npm test          # Vitest (unit + DB + contract)
npm run test:e2e  # Playwright
npm run typecheck # tsc --noEmit
npm run build     # next build --webpack
```

31 unit suites live under `src/`, E2E specs and setup under `test/`.

## Environment

| Variable | Required | Description |
|---|---|---|
| `APP_PASSWORD` | Yes | argon2id hash of your password — make one with `npm run hash-password -- <password>` |
| `APP_SECRET` | Yes | >=32 chars, used for HKDF key derivation |
| `DATABASE_URL` | Yes | Points at your database. The example file ships with the Postgres container from `docker-compose.yml` (`npm run db:up`); SQLite file URLs work too — the schema datasource is sqlite |
| `TEST_DATABASE_URL` | No | Test DB (must end in `_test`) |
| `E2E_DATABASE_URL` | No | E2E DB (must end in `_e2e`) |
| `AI_TIMEOUT_SECONDS` | No | Override AI timeout |

## Design

See `docs/superpowers/specs/2026-11-02-leyp-design.md` for the full spec (12 sections, 6 phases), and `docs/superpowers/plans/` for the phase plan.

## License

MIT — see [LICENSE](LICENSE).
