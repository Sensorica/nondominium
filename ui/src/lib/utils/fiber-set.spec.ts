import { describe, it, expect } from 'vitest';
import { Effect as E, Exit } from 'effect';
import { createFiberSet, isTaskInterrupted, TaskInterrupted } from './fiber-set';

/** A promise the test settles by hand, standing in for a zome call still in flight. */
function deferred<A>() {
  let resolve!: (value: A) => void;
  const promise = new Promise<A>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('fiber-set', () => {
  it('resolves with the Exit of a task that completes', async () => {
    const tasks = createFiberSet();
    const exit = await tasks.run(E.succeed(42));
    expect(Exit.isSuccess(exit) && exit.value).toBe(42);
    expect(tasks.size).toBe(0);
  });

  it('resolves a typed failure as a failed Exit, not a rejection', async () => {
    const tasks = createFiberSet();
    const exit = await tasks.run(E.fail('boom'));
    expect(Exit.isFailure(exit)).toBe(true);
  });

  it('close interrupts a pending task and its late result is never applied', async () => {
    const tasks = createFiberSet();
    const gate = deferred<string>();
    let interrupted = false;
    let state = 'initial';

    const pending = tasks
      .run(
        E.promise(() => gate.promise).pipe(
          E.onInterrupt(() =>
            E.sync(() => {
              interrupted = true;
            })
          )
        )
      )
      .then((exit) => {
        if (Exit.isSuccess(exit)) state = exit.value;
      });

    await Promise.resolve();
    expect(tasks.size).toBe(1);

    tasks.close();
    await expect(pending).rejects.toBeInstanceOf(TaskInterrupted);

    gate.resolve('late result');
    await new Promise((r) => setTimeout(r, 0));

    expect(interrupted).toBe(true);
    expect(state).toBe('initial');
    expect(tasks.size).toBe(0);
    expect(tasks.closed).toBe(true);
  });

  it('refuses new work after close without starting it', async () => {
    const tasks = createFiberSet();
    tasks.close();
    let ran = false;
    const attempt = tasks.run(
      E.sync(() => {
        ran = true;
      })
    );
    const error = await attempt.catch((e: unknown) => e);
    expect(isTaskInterrupted(error)).toBe(true);
    expect(ran).toBe(false);
  });

  it('close interrupts every tracked fiber, not only the latest', async () => {
    const tasks = createFiberSet();
    const results = [1, 2, 3].map(() => tasks.run(E.never).catch((e: unknown) => e));
    expect(tasks.size).toBe(3);
    tasks.close();
    const errors = await Promise.all(results);
    expect(errors.every(isTaskInterrupted)).toBe(true);
  });
});
