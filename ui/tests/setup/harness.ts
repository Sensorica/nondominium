/**
 * Shared harness for the e2e suite: ready-file parsing, leftover-process port
 * guard, and the direct zome-call seeding client.
 *
 * The conductor manager is scripts/launch-happ.mjs in E2E mode (see its header
 * comment): fixed short workdir /tmp/ndo-e2e (lair unix-socket SUN_LEN limit;
 * $TMPDIR is unstable across nested `nix develop` shells), ready.json written
 * once conductors are installed and Vite servers listen.
 */
import { AdminWebsocket, AppWebsocket, type CellId } from '@holochain/client';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const PROJECT_ROOT = join(__dirname, '../../..');
export const E2E_WORKDIR = process.env.E2E_WORKDIR || '/tmp/ndo-e2e';
export const READY_FILE = join(E2E_WORKDIR, 'ready.json');
export const PID_FILE = join(E2E_WORKDIR, '.launcher.pid');
export const LAUNCHER_LOG = join(E2E_WORKDIR, 'launcher.log');
export const AGENT_COUNT = 2;
/** E2E UI ports are 6173+ — deliberately NOT the dev network's 5173+, so the
 * port guard below can never kill a developer's running `bun run network`. */
export const E2E_UI_BASE_PORT = 6173;
export const APP_ID = 'nondominium';

/**
 * Node's ws client sends NO Origin header by default (a browser always does),
 * and the conductor rejects origin-less handshakes with a 400 even when
 * allowed_origins is permissive. Every Node-side websocket connect must set
 * this explicitly.
 */
export const NODE_WS_ORIGIN = 'http://localhost';

export interface ReadyAgent {
  agent: number;
  adminWsUrl: string;
  appWsUrl: string;
  uiPort: number;
}

export interface ReadyFile {
  appId: string;
  workdir: string;
  launcherPid: number;
  agents: ReadyAgent[];
  updatedAt: string;
}

export function readReady(): ReadyFile {
  if (!existsSync(READY_FILE)) {
    throw new Error(`[e2e] ${READY_FILE} not found — did globalSetup run?`);
  }
  return JSON.parse(readFileSync(READY_FILE, 'utf8')) as ReadyFile;
}

export function uiPortForAgent(agent: number): number {
  return E2E_UI_BASE_PORT + (agent - 1);
}

function portsFromWsUrl(url: string): number[] {
  const match = url.match(/:(\d+)$/);
  return match ? [Number.parseInt(match[1], 10)] : [];
}

/**
 * Kills leftover e2e processes by PORT, never by workdir string: `pkill -f
 * <workdir>` matches the killing shell's own argv and SIGKILLs itself. Ports
 * are the fixed e2e UI ports plus any conductor ports recorded in a stale
 * ready.json from a previous crashed run.
 */
export function killLeftoverProcesses(): void {
  const ports = new Set<number>();
  for (let agent = 1; agent <= AGENT_COUNT; agent += 1) ports.add(uiPortForAgent(agent));
  try {
    const stale = readReady();
    for (const a of stale.agents) {
      for (const p of [...portsFromWsUrl(a.adminWsUrl), ...portsFromWsUrl(a.appWsUrl)]) ports.add(p);
    }
  } catch {
    // No stale ready file — fixed UI ports are enough.
  }
  for (const port of ports) {
    try {
      execSync(
        `PIDS=$(lsof -ti tcp:${port} 2>/dev/null); [ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null; true`,
        { stdio: 'ignore' }
      );
    } catch {
      // Best-effort.
    }
  }
}

function isHeadMoved(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('source chain head has moved') || message.includes('HeadMoved');
}

/**
 * Cap-grant commits contend with the browser doing the same on connect
 * ("source chain head has moved") — serialize and retry, mirroring
 * ui/src/lib/utils/hc-connect.ts.
 */
export async function authorizeWithRetry(
  admin: AdminWebsocket,
  cellId: CellId,
  attempts = 5
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await admin.authorizeSigningCredentials(cellId);
      return;
    } catch (error) {
      if (!isHeadMoved(error) || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
}

export interface SeedClient {
  app: AppWebsocket;
  admin: AdminWebsocket;
  close: () => Promise<void>;
}

/**
 * Direct zome-call client for seeding prerequisites and DHT read-backs
 * (playground-equivalent verification), used from Node test workers.
 *
 * Signing credentials live in an in-memory per-process map inside
 * @holochain/client — the browser's authorization does not carry over, so this
 * process re-authorizes every cell before connecting the app websocket.
 * The admin handle stays open so specs can authorize runtime-created clone
 * cells (see the Phase 0 clone-signing guard).
 */
export async function createSeedClient(agent = 1): Promise<SeedClient> {
  const ready = readReady();
  const entry = ready.agents.find((a) => a.agent === agent);
  if (!entry) throw new Error(`[e2e] agent ${agent} not present in ready.json`);

  const admin = await AdminWebsocket.connect({
    url: new URL(entry.adminWsUrl),
    wsClientOptions: { origin: NODE_WS_ORIGIN },
    defaultTimeout: 60_000
  });

  const cellIds = await admin.listCellIds();
  for (const cellId of cellIds) {
    await authorizeWithRetry(admin, cellId);
  }

  const { token } = await admin.issueAppAuthenticationToken({
    installed_app_id: ready.appId || APP_ID,
    single_use: false,
    expiry_seconds: 3600
  });

  const app = await AppWebsocket.connect({
    url: new URL(entry.appWsUrl),
    token,
    wsClientOptions: { origin: NODE_WS_ORIGIN },
    defaultTimeout: 60_000
  });

  return {
    app,
    admin,
    close: async () => {
      try {
        await app.client.close();
      } catch {
        // Transport may already be gone.
      }
      try {
        await admin.client.close();
      } catch {
        // Transport may already be gone.
      }
    }
  };
}
