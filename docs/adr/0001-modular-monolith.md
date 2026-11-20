# ADR 0001: Build as a modular monolith

- **Status:** Superseded by [ADR 0004](0004-single-nextjs-app.md) on 2026-11-20
- **Date:** 2026-11-20

## Context

Nexora has six modules (Core, Finance, HR, Procurement, Inventory, Reporting) that share data heavily. A goods receipt must update stock and the ledger together, and a payroll run must post to Finance. The team is small and the timeline is 13 weeks.

## Decision

Build one NestJS API and one Next.js web app, with one PostgreSQL database. Each ERP module is a NestJS module that owns its tables and exposes a service interface. Modules never query each other's tables directly.

## Consequences

- Cross-module operations run in a single ACID transaction, which accounting needs.
- One deployable keeps CI, hosting and local setup simple.
- Clear module boundaries keep the option to extract a module into its own service later.
- All modules scale together; acceptable for the expected load (about 200 concurrent users).

## Alternatives considered

- **Microservices:** independent scaling, but distributed transactions, more infrastructure and slower delivery for a small team.
- **Unstructured monolith:** fastest to start, but modules become tangled and hard to test.
