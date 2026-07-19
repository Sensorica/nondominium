/**
 * Spawns scripts/launch-happ.mjs in E2E mode (2 conductors, 2 Vite origins),
 * then blocks until the harness is fully ready: ready.json written AND every
 * agent UI origin answers HTTP 200. Must run inside the nix dev shell — `hc`
 * and `kitsune2-bootstrap-srv` come from there.
 */
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AGENT_COUNT,
  E2E_WORKDIR,
  E2E_UI_BASE_PORT,
  killLeftoverProcesses,
  LAUNCHER_LOG,
  PID_FILE,
  PROJECT_ROOT,
  readReady
} from './harness.js';

const READY_TIMEOUT_MS = 420_000; // path-install of the ~8MB happ is slow on cold start
const POLL_MS = 2_000;

function preflight(): void {
  try {
    execSync('hc --version', { stdio: 'ignore' });
  } catch {
    throw new Error(
      '[e2e] `hc` is not on PATH. Run the suite from the nix dev shell: ' +
        '`nix develop --command bun run e2e` (from the repo root).'
    );
  }
  const happPath = join(PROJECT_ROOT, 'workdir', 'nondominium.happ');
  if (!existsSync(happPath)) {
    throw new Error(`[e2e] Missing happ bundle: ${happPath} — run \`bun run build:happ\` first.`);
  }
}

async function uiOriginUp(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(1_500) });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function globalSetup(): Promise<void> {
  preflight();

  // Defensive guard against a previous crashed run keeping the fixed e2e
  // ports bound (leaked conductors would otherwise poison this run).
  killLeftoverProcesses();

  mkdirSync(E2E_WORKDIR, { recursive: true });
  const logFd = openSync(LAUNCHER_LOG, 'a');

  // detached:true puts the launcher and all its descendants (bootstrap srv,
  // hc sandbox, holochain, lair-keystore, vite) in their own process group so
  // globalTeardown can reap the whole tree with process.kill(-pid).
  const launcher = spawn('node', [join(PROJECT_ROOT, 'scripts', 'launch-happ.mjs')], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      E2E: '1',
      AGENTS: String(AGENT_COUNT),
      NO_OPEN: '1',
      UI_PORT: String(E2E_UI_BASE_PORT)
    },
    stdio: ['ignore', logFd, logFd],
    detached: true
  });
  launcher.unref();
  if (!launcher.pid) throw new Error('[e2e] failed to spawn launch-happ.mjs');
  writeFileSync(PID_FILE, String(launcher.pid));

  console.log(
    `[e2e] launch-happ.mjs spawned (pid ${launcher.pid}); waiting for conductors + UI servers… (log: ${LAUNCHER_LOG})`
  );

  const deadline = Date.now() + READY_TIMEOUT_MS;
  let launcherDead = false;
  launcher.on('exit', () => {
    launcherDead = true;
  });

  while (Date.now() < deadline) {
    if (launcherDead) {
      throw new Error(`[e2e] launch-happ.mjs exited before ready — see ${LAUNCHER_LOG}`);
    }
    try {
      const ready = readReady();
      const checks = await Promise.all(ready.agents.map((a) => uiOriginUp(a.uiPort)));
      if (ready.agents.length >= AGENT_COUNT && checks.every(Boolean)) {
        console.log(
          `[e2e] harness ready: ${ready.agents
            .map((a) => `agent ${a.agent} → ui :${a.uiPort}, app ${a.appWsUrl}`)
            .join(' | ')}`
        );
        return;
      }
    } catch {
      // ready.json not written yet — keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  throw new Error(
    `[e2e] harness not ready after ${READY_TIMEOUT_MS / 1000}s — see ${LAUNCHER_LOG}`
  );
}
