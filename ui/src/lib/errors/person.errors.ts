import { Data } from 'effect';

export class PersonError extends Data.TaggedError('PersonError')<{
  readonly message: string;
  readonly cause?: unknown;
  readonly context?: string;
}> {
  static fromError(error: unknown, context: string): PersonError {
    if (error instanceof PersonError) return error;
    const message = error instanceof Error ? error.message : String(error);
    return new PersonError({ message: `${context}: ${message}`, cause: error, context });
  }

  static create(message: string, context?: string): PersonError {
    return new PersonError({ message, context });
  }
}
