import { Data } from 'effect';

export class GroupError extends Data.TaggedError('GroupError')<{
  readonly message: string;
  readonly cause?: unknown;
  readonly context?: string;
}> {
  static fromError(error: unknown, context: string): GroupError {
    if (error instanceof GroupError) return error;
    const message = error instanceof Error ? error.message : String(error);
    return new GroupError({ message: `${context}: ${message}`, cause: error, context });
  }

  static create(message: string, context?: string): GroupError {
    return new GroupError({ message, context });
  }
}
