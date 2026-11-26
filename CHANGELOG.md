# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/). From Day 8 the entries are generated from Conventional Commit messages at each milestone release.

## [Unreleased]

### Added — Day 9 (sign-in, roles, users)

- Email and password sign-in and sign-out; bcrypt (cost 12) and an 8-hour encrypted iron-session cookie holding only the user ID. Five attempts per minute per email (FR-01, NFR-01).
- `getCurrentUser` reloads the user on every request, so deactivated users are signed out at once. `requireRole` guards every service function; `requirePageRole` guards pages (FR-03).
- Users list with search and pagination, create and edit forms, deactivate and reactivate; Admins cannot demote or deactivate themselves (FR-02).
- Seed script with one demo user per role.
- Integration tests run against a separate `nexora_test` database.

### Added — Day 8 (app shell and database)

- Next.js 16 app (App Router, React 19, TypeScript strict) with Tailwind CSS 4 and shadcn/ui.
- App shell: sidebar navigation filtered by role, header, placeholder dashboard, `/api/health`.
- Prisma schema for the 12 tables and 5 enums in `docs/erd.md`; first migration with the check constraints from rule D8.
- Vitest set up with a first unit test. CI now runs format, lint, type check, migrations, tests and build against PostgreSQL 17, on `main` and `develop`.

### Changed — proposal Revision 1 (Day 5, 20 Nov 2026)

- Timeline replaced with Nexora's official 21-day schedule: six phases, milestones on Days 11, 14, 18 and 21.
- Scope reduced to a procure-to-stock MVP (Core, Inventory, Procurement, Dashboard). Finance and HR moved to future phases.
- Stack simplified to one Next.js app with PostgreSQL through Prisma (ADR 0004). Fixed roles and session-cookie authentication (ADR 0005).
- Database redesigned from 29 to 12 tables. Eleven design concerns resolved (see `docs/erd.md`).
- Diagrams and wireframes redrawn for the new scope. A goods receipt wireframe was added.
- Repository simplified to a single package: Turborepo, workspaces, `apps/` and `packages/` removed. Docker Compose now runs PostgreSQL only. CI targets `main`.

### Added — first submission (Day 4, 19 Nov 2026)

- Project proposal and system design document (PDF and Markdown).
- Architecture overview, ERD, architecture decision records and wireframes in `docs/`.
- Monorepo tooling: pnpm workspaces, Turborepo, shared ESLint, TypeScript and Prettier presets.
- Commit and code-quality hooks: Husky, lint-staged, Commitlint.
- Docker Compose services for local development: PostgreSQL 17, Redis 7, MinIO, Mailpit.
- GitHub Actions CI, CodeQL scanning, Dependabot, CODEOWNERS, PR and issue templates.
