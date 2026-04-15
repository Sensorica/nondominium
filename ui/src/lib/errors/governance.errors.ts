import { Data } from 'effect';

export class GovernanceError extends Data.TaggedError('GovernanceError')<{
  readonly message: string;
  readonly cause?: unknown;
  readonly context?: string;
}> {
  static fromError(error: unknown, context: string): GovernanceError {
    if (error instanceof GovernanceError) return error;
    const message = error instanceof Error ? error.message : String(error);
    return new GovernanceError({ message: `${context}: ${message}`, cause: error, context });
  }

  static create(message: string, context?: string): GovernanceError {
    return new GovernanceError({ message, context });
  }
}

export class WorkflowError extends Data.TaggedError('WorkflowError')<{
  readonly message: string;
  readonly cause?: unknown;
  readonly context?: string;
  readonly step?: string;
  readonly rejected_reasons?: readonly string[];
}> {
  static fromError(error: unknown, context: string): WorkflowError {
    if (error instanceof WorkflowError) return error;
    const message = error instanceof Error ? error.message : String(error);
    return new WorkflowError({ message: `${context}: ${message}`, cause: error, context });
  }

  static create(message: string, context?: string): WorkflowError {
    return new WorkflowError({ message, context });
  }

  static rejected(step: string, reasons: readonly string[]): WorkflowError {
    return new WorkflowError({
      message: `Workflow step '${step}' rejected: ${reasons.join('; ')}`,
      step,
      rejected_reasons: reasons
    });
  }
}
