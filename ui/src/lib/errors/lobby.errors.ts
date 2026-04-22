import { Data } from 'effect';

export class LobbyError extends Data.TaggedError('LobbyError')<{
  readonly message: string;
  readonly cause?: unknown;
  readonly context?: string;
}> {
  static fromError(error: unknown, context: string): LobbyError {
    if (error instanceof LobbyError) return error;
    const message = error instanceof Error ? error.message : String(error);
    return new LobbyError({ message: `${context}: ${message}`, cause: error, context });
  }

  static create(message: string, context?: string): LobbyError {
    return new LobbyError({ message, context });
  }
}
