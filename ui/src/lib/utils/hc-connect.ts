import { AdminWebsocket, AppWebsocket, type CellId } from '@holochain/client';

const DEV_AGENT_STORAGE_KEY = 'ndo_dev_agent';
const DEV_WS_ORIGIN = 'nondominium-ui';
const DEV_REQUEST_TIMEOUT_MS = 300_000;
const MANIFEST_WAIT_MS = 300_000;

export interface HcLauncherEnvironment {
  APP_INTERFACE_PORT: number;
  INSTALLED_APP_ID: string;
  APP_INTERFACE_TOKEN: number[];
}

export interface HcConnectionAgent {
  agent: number;
  adminWsUrl: string;
  appWsUrl: string;
}

export interface HcConnectionManifest {
  appId: string;
  agents: HcConnectionAgent[];
  updatedAt?: string;
}

export type HolochainConnectionMode = 'launcher' | 'manifest' | 'env';

export interface HolochainConnectResult {
  client: AppWebsocket;
  connectionUrl: string;
  connectionMode: HolochainConnectionMode;
  /**
   * Admin websocket URL used for this connection, when available (manifest/env
   * modes). Needed to authorize signing credentials for group clone cells that
   * are created at runtime. Undefined in launcher mode (the launcher signs).
   */
  adminWsUrl?: string;
}

export class HolochainConnectionError extends Error {
  readonly hints: string[];

  constructor(message: string, hints: string[]) {
    super(message);
    this.name = 'HolochainConnectionError';
    this.hints = hints;
  }
}

function getLauncherEnvironment(): HcLauncherEnvironment | undefined {
  if (typeof window === 'undefined' || !('__HC_LAUNCHER_ENV__' in window)) {
    return undefined;
  }
  return (window as Window & { __HC_LAUNCHER_ENV__?: HcLauncherEnvironment }).__HC_LAUNCHER_ENV__;
}

export function getDevAgentIndex(): number {
  // 1. `?agent=N` query param — optional manual override for a single origin.
  if (typeof window !== 'undefined') {
    const param = new URLSearchParams(window.location.search).get('agent');
    if (param) {
      const fromUrl = Number.parseInt(param, 10);
      if (Number.isFinite(fromUrl) && fromUrl > 0) return fromUrl;
    }
  }
  // 2. VITE_DEV_AGENT — the primary mechanism. The launcher starts one Vite dev
  // server per agent (one port each) with this env var set, so every origin is
  // pinned to its conductor and gets fully isolated localStorage.
  const envAgent = import.meta.env.VITE_DEV_AGENT as string | undefined;
  if (envAgent) {
    const fromEnv = Number.parseInt(envAgent, 10);
    if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  }
  // 3. localStorage / default.
  if (typeof localStorage === 'undefined') return 1;
  const stored = localStorage.getItem(DEV_AGENT_STORAGE_KEY);
  const parsed = stored ? Number.parseInt(stored, 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function setDevAgentIndex(agent: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DEV_AGENT_STORAGE_KEY, String(agent));
}

/**
 * Namespaces a localStorage key by the current dev agent index so two
 * same-origin browser windows (`?agent=1` and `?agent=2`) keep independent
 * UI-only state (profiles, disclosure prefs, visited groups). Without this,
 * setting a nickname for agent 2 would overwrite agent 1's in shared storage.
 */
export function devStorageKey(base: string): string {
  return `${base}__a${getDevAgentIndex()}`;
}

async function fetchConnectionManifest(): Promise<HcConnectionManifest | null> {
  try {
    const response = await fetch('/hc-connection.json', { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as HcConnectionManifest;
  } catch {
    return null;
  }
}

async function waitForConnectionManifest(
  maxWaitMs = MANIFEST_WAIT_MS,
  pollIntervalMs = 2_000
): Promise<HcConnectionManifest | null> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const manifest = await fetchConnectionManifest();
    if (manifest?.agents?.length) return manifest;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return fetchConnectionManifest();
}

async function connectViaAdminAndApp(
  adminWsUrl: string,
  appWsUrl: string,
  installedAppId: string
): Promise<AppWebsocket> {
  // NOTE: do not pass `wsClientOptions: { origin }` here. In a browser,
  // isomorphic-ws resolves to the native WebSocket, whose second argument is a
  // subprotocol string — an object becomes the invalid subprotocol
  // "[object Object]". The dev conductors are created with allowed_origins: Any,
  // and browsers set the Origin header automatically, so it is unnecessary.
  const adminWs = await AdminWebsocket.connect({
    url: new URL(adminWsUrl),
    defaultTimeout: DEV_REQUEST_TIMEOUT_MS
  });

  const tokenResponse = await adminWs.issueAppAuthenticationToken({
    installed_app_id: installedAppId,
    single_use: false,
    expiry_seconds: 999_999
  });

  const client = await AppWebsocket.connect({
    url: new URL(appWsUrl),
    token: tokenResponse.token,
    defaultTimeout: DEV_REQUEST_TIMEOUT_MS
  });

  const appInfo = await client.appInfo();
  if (appInfo?.cell_info) {
    // Authorize one cell at a time. Each grant is a source-chain commit; running
    // them in parallel (or while another tab/connect does the same) triggers
    // "source chain head has moved", so we serialize and retry on contention.
    // Cloned cells (group cells) are authorized too: on reload their in-memory
    // signing credentials are gone, so zome calls would otherwise fail.
    // Disabled clones are skipped: authorizing one errors (CellDisabled), and a
    // disabled clone isn't used until re-enabled (ensureCloneCell), which
    // authorizes signing at that point.
    for (const cells of Object.values(appInfo.cell_info)) {
      for (const cellInfo of cells) {
        if (cellInfo.type === 'provisioned') {
          await authorizeWithRetry(adminWs, cellInfo.value.cell_id);
        } else if (cellInfo.type === 'cloned' && cellInfo.value.enabled !== false) {
          await authorizeWithRetry(adminWs, cellInfo.value.cell_id);
        }
      }
    }
  }

  return client;
}

/**
 * Authorizes signing credentials for a single cell (e.g., a group clone cell
 * created at runtime) by opening a short-lived admin connection. The credentials
 * are stored in @holochain/client's shared module-level map, so the existing
 * AppWebsocket can sign zome calls to the cell afterwards.
 */
export async function authorizeCellSigning(adminWsUrl: string, cellId: CellId): Promise<void> {
  const adminWs = await AdminWebsocket.connect({
    url: new URL(adminWsUrl),
    defaultTimeout: DEV_REQUEST_TIMEOUT_MS
  });
  try {
    await authorizeWithRetry(adminWs, cellId);
  } finally {
    // Best-effort close; ignore if the transport is already gone.
    try {
      await adminWs.client.close();
    } catch {
      /* noop */
    }
  }
}

function isSourceChainHeadMoved(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('source chain head has moved') || message.includes('HeadMoved');
}

async function authorizeWithRetry(
  adminWs: AdminWebsocket,
  cellId: CellId,
  attempts = 5
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await adminWs.authorizeSigningCredentials(cellId);
      return;
    } catch (error) {
      if (!isSourceChainHeadMoved(error) || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
}

const BROWSER_DEV_HINTS = [
  'Wait until the terminal shows "[launch-happ] Agent N ready" for each agent, then click Retry in the UI.',
  'Large happ bundles can take a few minutes to install on first start — keep the terminal open.',
  'If startup fails, stop the process and run `bun run network` again (runs `hc sandbox clean` first).'
];

/**
 * Connect to the local Holochain conductor.
 * 1. hc-spin Electron launcher env (when using hc-spin directly)
 * 2. /hc-connection.json written by scripts/launch-happ.mjs (`bun run network`)
 * 3. VITE_HC_ADMIN_WS_URL + VITE_HC_APP_WS_URL (manual override)
 */
export async function connectHolochainClient(
  defaultAppId: string
): Promise<HolochainConnectResult> {
  const launcherEnv = getLauncherEnvironment();
  if (launcherEnv?.APP_INTERFACE_PORT) {
    const connectionUrl = `ws://localhost:${launcherEnv.APP_INTERFACE_PORT}`;
    const client = await AppWebsocket.connect({
      url: new URL(connectionUrl),
      token: launcherEnv.APP_INTERFACE_TOKEN,
      wsClientOptions: { origin: 'hc-spin' }
    });
    return { client, connectionUrl, connectionMode: 'launcher' };
  }

  const manifest = await waitForConnectionManifest();
  if (manifest?.agents?.length) {
    const preferredAgent = getDevAgentIndex();
    const agentConfig =
      manifest.agents.find((entry) => entry.agent === preferredAgent) ?? manifest.agents[0];
    const installedAppId = manifest.appId || defaultAppId;
    const client = await connectViaAdminAndApp(
      agentConfig.adminWsUrl,
      agentConfig.appWsUrl,
      installedAppId
    );
    return {
      client,
      connectionUrl: agentConfig.appWsUrl,
      connectionMode: 'manifest',
      adminWsUrl: agentConfig.adminWsUrl
    };
  }

  const adminWsUrl = import.meta.env.VITE_HC_ADMIN_WS_URL as string | undefined;
  const appWsUrl = import.meta.env.VITE_HC_APP_WS_URL as string | undefined;
  const installedAppId =
    (import.meta.env.VITE_HC_APP_ID as string | undefined) || defaultAppId;

  if (adminWsUrl && appWsUrl) {
    const client = await connectViaAdminAndApp(adminWsUrl, appWsUrl, installedAppId);
    return { client, connectionUrl: appWsUrl, connectionMode: 'env', adminWsUrl };
  }

  throw new HolochainConnectionError(
    'Unable to connect to Holochain — no launcher environment and no dev connection info found.',
    BROWSER_DEV_HINTS
  );
}
