# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/). From Day 8 the entries are generated from Conventional Commit messages at each milestone release.

## [Unreleased]

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
