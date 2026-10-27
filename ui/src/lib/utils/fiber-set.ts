import { Effect as E, Exit } from 'effect';
import type { Fiber } from 'effect';

/**
 * The set of fibers a view-scoped store has started, so that tearing the view down
 * interrupts all of them (R&O invariant 7: component-started work is interrupted on
 * teardown). A store forks every Effect through `run` and calls `close` from `destroy`.
 */

/** Rejection reason of a task interrupted by `close`, or whose result arrived after it. */
export class TaskInterrupted extends Error {
  readonly _tag = 'TaskInterrupted';
  constructor() {
    super('Task interrupted: its owner was destroyed');
    this.name = 'TaskInterrupted';
  }
}

export const isTaskInterrupted = (error: unknown): error is TaskInterrupted =>
  error instanceof TaskInterrupted;

export interface FiberSet {
  /**
   * Forks `effect` as a tracked fiber and resolves with its Exit. Rejects with
   * `TaskInterrupted` when the fiber was interrupted or the set closed before the
   * Exit arrived, so a caller never writes a result its owner no longer wants.
   */
  run<A, Err>(effect: E.Effect<A, Err>): Promise<Exit.Exit<A, Err>>;
  /** Fibers still running. */
  readonly size: number;
  readonly closed: boolean;
  /** Interrupts every tracked fiber and refuses new work. Idempotent. */
  close(): void;
}

export function createFiberSet(): FiberSet {
  const fibers = new Set<Fiber.Fiber<unknown, unknown>>();
  let closed = false;

  function run<A, Err>(effect: E.Effect<A, Err>): Promise<Exit.Exit<A, Err>> {
    if (closed) return Promise.reject(new TaskInterrupted());
    const fiber = E.runFork(effect);
    fibers.add(fiber);
    return new Promise((resolve, reject) => {
      fiber.addObserver((exit) => {
        fibers.delete(fiber);
        if (closed || Exit.hasInterrupts(exit)) reject(new TaskInterrupted());
        else resolve(exit);
      });
    });
  }

  function close(): void {
    if (closed) return;
    closed = true;
    for (const fiber of fibers) fiber.interruptUnsafe();
    fibers.clear();
  }

  return {
    run,
    get size() {
      return fibers.size;
    },
    get closed() {
      return closed;
    },
    close
  };
}
