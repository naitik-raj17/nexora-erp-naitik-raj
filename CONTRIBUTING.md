# Contributing to Nexora ERP

This guide covers how work moves from an issue to a release.

## Prerequisites

- Node.js 24 (see `.nvmrc`) and pnpm 9 (`corepack enable`)
- Docker with Docker Compose (local PostgreSQL only)
- VS Code with the recommended extensions (`.vscode/extensions.json`)

## Local setup

Application code arrives on Day 8, after the revised proposal is approved.

```bash
git clone https://github.com/naitik-raj17/nexora-erp-naitik-raj.git
cd nexora-erp-naitik-raj
corepack enable
pnpm install            # also installs the Git hooks
cp .env.example .env    # then set SESSION_SECRET
pnpm db:up              # PostgreSQL 17 in Docker
pnpm db:migrate && pnpm db:seed
pnpm dev                # http://localhost:3000
```

## Workflow (GitHub Flow)

1. Pick a card for today from the GitHub Projects board and move it to **In Progress**.
2. Branch from `main`: `feature/<issue-id>-<short-name>` or `fix/<issue-id>-<short-name>`.
3. Commit small, focused changes using Conventional Commits.
4. Open a pull request into `main` and fill in the template. Vercel posts a preview URL.
5. CI must pass. Squash-merge and delete the branch. Vercel deploys `main` to production.
6. At each Nexora phase deadline, tag a release: `v0.1.0` (Day 11), `v0.2.0` (Day 14), `v0.3.0` (Day 18), `v1.0.0` (Day 21).

## Commit messages

Format: `type(scope): summary`, checked by Commitlint on every commit.

- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- **Scopes:** `core`, `inventory`, `procurement`, `reporting`, `ui`, `db`, `auth`, `test`, `ci`, `deps`, `docs`

Examples:

```
feat(procurement): add goods receipt form
fix(inventory): block stock issue below zero
test(procurement): cover over-receipt
```

## Definition of done

- [ ] Meets the requirement's acceptance criteria
- [ ] Service functions have unit tests; CI is green
- [ ] Every new server action calls `requireRole` and is covered by the role test
- [ ] UI checked at 1440 px and 768 px widths
- [ ] Merged to `main`, deployed, and the board card is closed

## Code style

- TypeScript strict mode; no `any` without a comment explaining why.
- Prettier formats on commit (lint-staged).
- Business rules live in `src/server/*`, never in components or actions.
- Input is validated with Zod schemas in `src/lib/schemas`.
- Money and quantities use Prisma `Decimal`, never JavaScript floats.

## Security

- Never commit `.env` files or secrets; use GitHub Actions secrets for CI.
- Report vulnerabilities privately to the repository owner rather than in a public issue.
