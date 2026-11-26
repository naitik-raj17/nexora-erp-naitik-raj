import { notFound } from 'next/navigation';
import { NotFoundError } from '@/server/errors';

/** Awaits a service call and turns NotFoundError into the 404 page. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}
