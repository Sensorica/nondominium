import { Data } from 'effect';

export class ResourceError extends Data.TaggedError('ResourceError')<{
  readonly message: string;
  readonly cause?: unknown;
  readonly context?: string;
}> {
  static fromError(error: unknown, context: string): ResourceError {
    if (error instanceof ResourceError) return error;
    const message = error instanceof Error ? error.message : String(error);
    return new ResourceError({ message: `${context}: ${message}`, cause: error, context });
  }

  static create(message: string, context?: string): ResourceError {
    return new ResourceError({ message, context });
  }
}
