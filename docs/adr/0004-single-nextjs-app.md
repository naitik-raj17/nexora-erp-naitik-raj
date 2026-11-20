# ADR 0004: One Next.js application and one PostgreSQL database

- **Status:** Accepted (pending management approval of proposal Revision 1)
- **Date:** 2026-11-20
- **Supersedes:** [ADR 0001](0001-modular-monolith.md), [ADR 0002](0002-technology-stack.md)

## Context

Nexora's internship runs for 21 days. Only Days 8 to 14 are for development; Days 15 to 18 are for testing and Days 19 to 21 for documentation. The first proposal used a Next.js web app plus a NestJS API in a Turborepo monorepo, with Redis, BullMQ, MinIO, SMTP and Puppeteer. Management rejected it as too complex for the time available.

## Decision

- Build **one Next.js 16 application** (App Router, TypeScript). Server Components read data. Server Actions handle writes. One route handler serves CSV export.
- Keep all business rules in a plain TypeScript **service layer** (`src/server/*`). Each function takes the current user and validated input and runs in a Prisma transaction. Pages and actions stay thin.
- Use **PostgreSQL 17 through Prisma 6**. Raw SQL is added in migrations for check constraints, and used for atomic stock updates.
- Remove Redis, BullMQ, MinIO, Nodemailer, Puppeteer, Sentry, Turborepo, TanStack Query and Zustand. No MVP feature needs them.
- Host the app on Vercel and the database on Neon, both on free tiers.

## Consequences

- One build, one deployment and no CORS or token passing between apps. This saves an estimated two of the seven development days.
- Business rules can be unit-tested with Vitest without starting Next.js.
- The service layer could later be exposed through a REST API (or moved into NestJS) without rewriting its rules.
- The app has no background jobs. Every operation must be a short transaction, which holds for the MVP scope.

## Alternatives considered

- **Keep Next.js + NestJS:** cleaner API boundary, but two apps to build, configure, deploy and test in seven days.
- **Express API + React SPA:** still two apps, and more hand-written plumbing than Next.js.
