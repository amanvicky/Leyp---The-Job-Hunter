# Leyp — The Job Hunter

A self-hosted job-search application for one person. Keep your career history in one profile; for every job you apply to, Leyp reads the posting, shows how you match, drafts a tailored resume and cover letter using only facts from your profile, and tracks the application from draft to offer.

Runs on localhost, stores everything in a local PostgreSQL database, and talks to an AI model of your choosing — a local one through Ollama, or any hosted provider.

## The one rule

**A human approves every send.** Leyp never sends an application, an email, or a reply on its own. It prepares; you decide.

This is enforced structurally, not by convention: agent-prepared drafts stay hidden from every screen until approved, and there is no code path from a scheduled job to a sent email.

## Documentation

| Document | What it is |
|---|---|
| [Design specification](docs/superpowers/specs/2026-11-02-leyp-design.md) | The full product and architecture spec — decisions, data model, AI layer, security, six phases |
| [Phase 1 plan](docs/superpowers/plans/2026-11-02-leyp-phase-1.md) | The walking skeleton, task by task, with tests and commands |

## Status

Design complete. Implementation not started.

## Stack

Next.js 16 · React 19 · TypeScript · Prisma 7 · PostgreSQL 18 · Tailwind 4 · Vitest · Playwright

## License

Not yet chosen.
