# ADR 0005: Three fixed roles and an encrypted session cookie

- **Status:** Accepted (pending management approval of proposal Revision 1)
- **Date:** 2026-11-20
- **Supersedes:** [ADR 0003](0003-authentication-and-rbac.md)

## Context

The first design had eight roles and a data-driven permission system (`roles`, `permissions`, `user_roles`, `role_permissions`), plus JWT access tokens with rotating refresh tokens revoked through Redis. The MVP's procure-to-stock flow needs only three kinds of user, and one day (Day 9) is available for authentication and authorisation.

## Decision

- Roles are a PostgreSQL enum on `users.role`: `ADMIN`, `MANAGER`, `STAFF`. Each user has exactly one role.
- Passwords are hashed with bcryptjs (cost 12). Sign-in is rate-limited to 5 attempts per minute per email.
- The session is an encrypted, httpOnly, Secure, SameSite=Lax cookie (iron-session) that holds only the user ID. It expires after 8 hours.
- Every request reloads the user from the database, so deactivating a user or changing their role takes effect immediately, with no revocation list.
- `requireRole(user, ...roles)` is called inside every service function that changes data. A Vitest test calls each server action with each role and checks the permission matrix in the proposal.
- Approving your own PO is blocked in the service and by the database constraint `approved_by_id <> created_by_id`.

## Consequences

- Four fewer tables, no permission editor screen, and no Redis.
- New roles need a code change and a migration. That is acceptable for the MVP and is listed as a future phase.
- One extra indexed query per request to load the user, which is negligible at this scale.
