import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export type SessionData = { userId?: string };

const EIGHT_HOURS = 60 * 60 * 8;

function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32)
    throw new Error('SESSION_SECRET must be at least 32 characters.');
  return {
    password,
    cookieName: 'nexora_session',
    ttl: EIGHT_HOURS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  };
}

/** The encrypted session cookie. It holds only the user ID (ADR 0005). */
export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}
