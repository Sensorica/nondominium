import { Data } from 'effect';

export class PPRError extends Data.TaggedError('PPRError')<{
  readonly message: string;
  readonly cause?: unknown;
  readonly context?: string;
}> {
  static fromError(error: unknown, context: string): PPRError {
    if (error instanceof PPRError) return error;
    const message = error instanceof Error ? error.message : String(error);
    return new PPRError({ message: `${context}: ${message}`, cause: error, context });
  }

  static create(message: string, context?: string): PPRError {
    return new PPRError({ message, context });
  }
}
