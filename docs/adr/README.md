# Architecture decision records

Each significant technical decision is recorded here with its context and consequences. New ADRs copy the format of the existing ones and take the next number. Superseded ADRs are kept for history.

| ADR                                          | Decision                                                     | Status             |
| -------------------------------------------- | ------------------------------------------------------------ | ------------------ |
| [0001](0001-modular-monolith.md)             | Build as a modular monolith (NestJS API + Next.js)           | Superseded by 0004 |
| [0002](0002-technology-stack.md)             | TypeScript stack: Next.js, NestJS, PostgreSQL, Prisma, Redis | Superseded by 0004 |
| [0003](0003-authentication-and-rbac.md)      | JWT with rotating refresh tokens and permission-based RBAC   | Superseded by 0005 |
| [0004](0004-single-nextjs-app.md)            | One Next.js application and one PostgreSQL database          | Accepted           |
| [0005](0005-fixed-roles-and-session-auth.md) | Three fixed roles and an encrypted session cookie            | Accepted           |
