/** A rule was broken in a way the user can fix (shown as a form error). */
export class ValidationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: Record<string, string[] | undefined> = {},
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** The signed-in user's role does not allow this action. */
export class ForbiddenError extends Error {
  constructor(message = 'You do not have permission to do this.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(what = 'Record') {
    super(`${what} not found.`);
    this.name = 'NotFoundError';
  }
}
