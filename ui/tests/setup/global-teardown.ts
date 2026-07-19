/**
 * Reaps the whole launcher process group, then double-checks by port. The
 * launcher log is preserved under test-results/ before the workdir is removed.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { E2E_WORKDIR, killLeftoverProcesses, LAUNCHER_LOG, PID_FILE } from './harness.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function killProcessGroup(pid: number, signal: NodeJS.Signals | number): boolean {
  try {
    // Negative pid targets the whole process group (launcher + bootstrap srv +
    // hc sandbox + holochain + lair + vite). Killing only the launcher pid
    // would leak detached descendants that keep the e2e ports bound.
    process.kill(-pid, signal);
    return true;
  } catch {
    return false;
  }
}

export default async function globalTeardown(): Promise<void> {
  if (existsSync(PID_FILE)) {
    const pid = Number.parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10);
    if (Number.isFinite(pid)) {
      killProcessGroup(pid, 'SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      killProcessGroup(pid, 'SIGKILL');
    }
  }

  // Belt and suspenders: anything still bound to the fixed e2e ports (or to
  // conductor ports recorded in ready.json) gets reaped even when setup died
  // before writing the pid file.
  killLeftoverProcesses();

  if (existsSync(LAUNCHER_LOG)) {
    const resultsDir = join(__dirname, '..', '..', 'test-results');
    mkdirSync(resultsDir, { recursive: true });
    copyFileSync(LAUNCHER_LOG, join(resultsDir, 'launcher.log'));
  }

  rmSync(E2E_WORKDIR, { recursive: true, force: true });
}
