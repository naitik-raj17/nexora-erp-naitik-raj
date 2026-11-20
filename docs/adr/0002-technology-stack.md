# ADR 0002: TypeScript stack — Next.js, NestJS, PostgreSQL, Prisma

- **Status:** Superseded by [ADR 0004](0004-single-nextjs-app.md) on 2026-11-20
- **Date:** 2026-11-20

## Context

The stack must be fixed before development starts. It needs strong typing, good support for forms and data tables, transactional integrity for accounting, and free or low-cost hosting for a demo.

## Decision

| Layer      | Choice                                                                                 |
| ---------- | -------------------------------------------------------------------------------------- |
| Frontend   | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui, TanStack Query and Table |
| Backend    | NestJS 11 on Node.js 24 LTS, REST with OpenAPI                                         |
| Database   | PostgreSQL 17                                                                          |
| ORM        | Prisma 6 with versioned migrations                                                     |
| Jobs       | Redis 7 + BullMQ                                                                       |
| Validation | Zod schemas shared by web and API                                                      |
| Monorepo   | pnpm workspaces + Turborepo                                                            |

## Consequences

- One language (TypeScript) across web, API and shared schemas; types flow end to end.
- NestJS modules, guards and interceptors map directly onto ERP modules, RBAC and audit logging.
- PostgreSQL gives ACID transactions, constraints for double-entry rules and views for reports.
- Prisma speeds up development; complex reports can still use raw SQL views.

## Alternatives considered

- **Django / Spring Boot:** mature, but a second language beside the TypeScript frontend.
- **MongoDB:** flexible schema, but weaker fit for relational, transactional accounting data.
