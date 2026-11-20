# ADR 0003: JWT with rotating refresh tokens and permission-based RBAC

- **Status:** Superseded by [ADR 0005](0005-fixed-roles-and-session-auth.md) on 2026-11-20
- **Date:** 2026-11-20

## Context

Eight roles need different access to each module, and some actions need approval limits and segregation of duties. Sessions must be revocable when a user is deactivated.

## Decision

- Short-lived JWT access tokens (15 minutes) sent in the `Authorization` header.
- Rotating refresh tokens (7 days) in an httpOnly, Secure, SameSite cookie; refresh token IDs are stored in Redis so they can be revoked.
- Passwords hashed with Argon2; rate limiting on login and refresh endpoints.
- Permissions are data, written as `module:action` (for example `procurement:approve`), granted to roles, and roles granted to users.
- A NestJS guard checks the required permission on every endpoint; the UI hides what the API already blocks.
- Business rules add approval limits and block self-approval.

## Consequences

- The API stays stateless apart from a small revocation list in Redis.
- New roles need no code change.
- Every endpoint must declare its permission; a missing declaration fails a unit test.
