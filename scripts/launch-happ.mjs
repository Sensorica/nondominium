#!/usr/bin/env node
/**
 * Dev network launcher: bootstrap + sandbox create/run + path-based app install.
 *
 * Avoids hc-spin's `hc sandbox generate --run` path, which streams the full .happ
 * over the admin websocket and times out on large bundles (~8MB).
 */
import { AdminWebsocket } from '@holochain/client';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiDir = path.join(root, 'ui');
const connectionPath = path.join(root, 'ui', 'static', 'hc-connection.json');
const happPath = path.join(root, 'workdir', 'nondominium.happ');
const appId = 'nondominium';
const LAIR_PASS = 'pass';
const INSTALL_TIMEOUT_MS = 300_000;
const WS_ORIGIN = 'nondominium-launch';

/**
 * E2E mode (E2E=1): used by the Playwright harness (ui/tests/setup/global-setup.ts).
 * - Sandboxes live under a fixed short workdir (default /tmp/ndo-e2e) instead of
 *   the project root: lair-keystore's unix-socket path must stay under the
 *   ~108-byte SUN_LEN limit, and $TMPDIR is unstable across nested `nix develop`
 *   shells, so the path is fixed and short. The `.hc` index also lands there,
 *   keeping e2e sandboxes fully isolated from `bun run network` dev sandboxes.
 * - Once every conductor is installed AND every per-agent Vite server is
 *   listening, a machine-readable ready file (<workdir>/ready.json) is written
 *   with per-agent admin/app websocket URLs, UI ports, and this process's pid.
 * - Pair with NO_OPEN=1 for headless runs. E2E_PLAYGROUND=1 additionally starts
 *   `hc playground` for interactive DHT inspection alongside the tests.
 */
const isE2E = process.env.E2E === '1';
const e2eWorkdir = process.env.E2E_WORKDIR || '/tmp/ndo-e2e';
// Sandboxes live in their own subdirectory so the fresh-run cleanup below can
// wipe them without unlinking files the Playwright globalSetup owns at the
// workdir root (launcher.log, .launcher.pid).
const e2eSandboxDir = path.join(e2eWorkdir, 'sandbox');
const sandboxCwd = isE2E ? e2eSandboxDir : root;
const readyPath = path.join(e2eWorkdir, 'ready.json');

const agents = Number.parseInt(process.env.AGENTS || '2', 10);
const uiPort = process.env.UI_PORT;
if (!uiPort) {
  console.error('[launch-happ] UI_PORT is required');
  process.exit(1);
}
if (!Number.isFinite(agents) || agents < 1) {
  console.error('[launch-happ] AGENTS must be a positive integer');
  process.exit(1);
}
if (!Number.isFinite(Number.parseInt(uiPort, 10))) {
  console.error(`[launch-happ] UI_PORT must be a number (got "${uiPort}")`);
  process.exit(1);
}
if (!fs.existsSync(happPath)) {
  console.error(`[launch-happ] Missing happ bundle: ${happPath} — run npm run build:happ first`);
  process.exit(1);
}

/** @type {import('node:child_process').ChildProcessWithoutNullStreams | null} */
let bootstrapProc = null;
/** @type {import('node:child_process').ChildProcessWithoutNullStreams | null} */
let sandboxProc = null;
/** @type {import('node:child_process').ChildProcess | null} */
let playgroundProc = null;
/** @type {import('node:child_process').ChildProcess[]} */
const uiProcs = [];

// E2E readiness tracking: ready.json is written only once conductors are
// installed AND every per-agent UI server is listening.
let conductorsInstalled = false;
/** @type {Map<number, number>} agentNum -> listening UI port */
const uiReadyPorts = new Map();

function maybeWriteReadyFile() {
  if (!isE2E) return;
  if (!conductorsInstalled || uiReadyPorts.size < agents) return;
  const ready = {
    appId,
    workdir: e2eWorkdir,
    launcherPid: process.pid,
    agents: manifest.agents.map((a) => ({
      ...a,
      uiPort: uiReadyPorts.get(a.agent) ?? uiPortForAgent(a.agent)
    })),
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(readyPath, `${JSON.stringify(ready, null, 2)}\n`);
  console.log(`[launch-happ] E2E ready file written → ${readyPath}`);
}

const basePort = Number.parseInt(uiPort, 10);

/** @param {number} agentNum @returns {number} the UI port for an agent (one origin per agent) */
function uiPortForAgent(agentNum) {
  return basePort + (agentNum - 1);
}

/** @type {{ appId: string; agents: Array<{ agent: number; adminWsUrl: string; appWsUrl: string }>; updatedAt: string | null }} */
const manifest = {
  appId,
  agents: [],
  updatedAt: null
};

function writeManifest() {
  manifest.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(connectionPath), { recursive: true });
  fs.writeFileSync(connectionPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

writeManifest();

/** @returns {Promise<number>} a free TCP port on localhost */
function allocatePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => {
        if (port) resolve(port);
        else reject(new Error('Failed to allocate a free port'));
      });
    });
  });
}

/** @param {string} line */
function stripAnsi(line) {
  return line.replace(/\x1B\[[0-9;]*m/g, '');
}

/**
 * @param {import('node:child_process').ChildProcessWithoutNullStreams} proc
 * @param {string} label
 * @param {(line: string) => void} [onLine]
 */
function pipeLines(proc, label, onLine) {
  let buffer = '';
  const handleChunk = (/** @type {Buffer} */ chunk, /** @type {boolean} */ isStderr) => {
    const text = chunk.toString();
    if (isStderr) process.stderr.write(text);
    else process.stdout.write(text);
    buffer += text;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      console.log(`[launch-happ] | [${label}]: ${trimmed}`);
      onLine?.(stripAnsi(trimmed));
    }
  };
  proc.stdout.on('data', (chunk) => handleChunk(chunk, false));
  proc.stderr.on('data', (chunk) => handleChunk(chunk, true));
}

/** @returns {Promise<{ bootstrapUrl: string; signalUrl: string }>} */
function startBootstrapServer() {
  return new Promise((resolve, reject) => {
    bootstrapProc = spawn('kitsune2-bootstrap-srv', [], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let bootstrapUrl;
    let signalUrl;
    let running = false;
    // Single settle guard so a later `close`/`error` after a successful resolve
    // cannot reject an already-settled promise (which would mask the real error).
    let settled = false;
    const done = (/** @type {() => void} */ fn) => {
      if (settled) return;
      settled = true;
      fn();
    };

    pipeLines(bootstrapProc, 'kitsune2-bootstrap-srv', (line) => {
      if (line.includes('#kitsune2_bootstrap_srv#listening#')) {
        const hostAndPort = line.split('#kitsune2_bootstrap_srv#listening#')[1].split('#')[0];
        bootstrapUrl = `http://${hostAndPort}`;
        signalUrl = `ws://${hostAndPort}`;
      }
      if (line.includes('#kitsune2_bootstrap_srv#running#')) {
        running = true;
      }
      if (running && bootstrapUrl && signalUrl) {
        done(() => resolve({ bootstrapUrl, signalUrl }));
      }
    });

    bootstrapProc.on('error', (err) => done(() => reject(err)));
    bootstrapProc.on('close', (code) => {
      if (!running) done(() => reject(new Error(`kitsune2-bootstrap-srv exited with code ${code ?? 'unknown'}`)));
    });
  });
}

/**
 * @param {number} nAgents
 * @param {string} bootstrapUrl
 * @param {number[]} appPorts
 * @returns {Promise<Record<number, { admin_port: number; app_ports: number[] }>>}
 */
function startSandboxes(nAgents, bootstrapUrl, appPorts) {
  return new Promise((resolve, reject) => {
    const createArgs = [
      'sandbox',
      '--piped',
      'create',
      // E2E: pin the sandbox root to the short fixed workdir (see header note).
      ...(isE2E ? ['--root', e2eSandboxDir] : []),
      '-n',
      String(nAgents),
      'network',
      '--bootstrap',
      bootstrapUrl,
      // Holochain 0.7 removed the WebRTC/tx5 transport; iroh over QUIC is the
      // only peer transport and `hc sandbox` accepts just `mem` or `quic`.
      'quic'
    ];

    console.log(`[launch-happ] Running: hc ${createArgs.join(' ')}`);
    const createResult = spawnSync('hc', createArgs, {
      cwd: sandboxCwd,
      encoding: 'utf8',
      input: `${LAIR_PASS}\n`,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    if (createResult.stdout) process.stdout.write(createResult.stdout);
    if (createResult.stderr) process.stderr.write(createResult.stderr);
    if (createResult.status !== 0) {
      reject(new Error(`hc sandbox create failed with code ${createResult.status ?? 'unknown'}`));
      return;
    }

    const portsCsv = appPorts.join(',');
    const runArgs = ['sandbox', '--piped', 'run', '-a', '-p', portsCsv];
    console.log(`[launch-happ] Running: hc ${runArgs.join(' ')}`);
    // `hc sandbox run` reads sandbox indices from `<cwd>/.hc`, so cwd must
    // match the create call above.
    sandboxProc = spawn('hc', runArgs, { cwd: sandboxCwd, stdio: ['pipe', 'pipe', 'pipe'] });
    sandboxProc.stdin.write(`${LAIR_PASS}\n`);
    sandboxProc.stdin.end();

    /** @type {Record<number, { admin_port: number; app_ports: number[] }>} */
    const portsInfo = {};
    let ready = 0;
    let settled = false;
    const done = (/** @type {() => void} */ fn) => {
      if (settled) return;
      settled = true;
      fn();
    };

    pipeLines(sandboxProc, 'hc sandbox', (line) => {
      const match = line.match(/Conductor launched #!(\d+)\s+(\{.+?\})/);
      if (!match) return;
      const agentNum = Number.parseInt(match[1], 10);
      try {
        const ports = JSON.parse(match[2]);
        portsInfo[agentNum] = ports;
        ready += 1;
        if (ready === nAgents) done(() => resolve(portsInfo));
      } catch (error) {
        done(() => reject(error));
      }
    });

    sandboxProc.on('error', (err) => done(() => reject(err)));
    sandboxProc.on('close', (code) => {
      if (ready < nAgents) {
        done(() => reject(new Error(`hc sandbox run exited before all conductors launched (code ${code ?? 'unknown'})`)));
      }
    });
  });
}

/**
 * @param {number} conductorIndex zero-based index from `Conductor launched #!N`
 * @param {{ admin_port: number; app_ports: number[] }} ports
 */
async function installHappOnConductor(conductorIndex, ports) {
  const agentNum = conductorIndex + 1;
  const adminWsUrl = `ws://localhost:${ports.admin_port}`;
  const appWsUrl = `ws://localhost:${ports.app_ports[0]}`;
  if (!ports.app_ports?.[0]) {
    throw new Error(`Agent ${agentNum}: no app interface port`);
  }

  console.log(`[launch-happ] Installing ${appId} on agent ${agentNum} (path install, timeout ${INSTALL_TIMEOUT_MS / 1000}s)…`);

  const adminWs = await AdminWebsocket.connect({
    url: new URL(adminWsUrl),
    wsClientOptions: { origin: WS_ORIGIN },
    defaultTimeout: INSTALL_TIMEOUT_MS
  });

  await adminWs.installApp({
    source: { type: 'path', value: happPath },
    installed_app_id: appId
  });

  await adminWs.enableApp({ installed_app_id: appId });

  const entry = { agent: agentNum, adminWsUrl, appWsUrl };
  const existing = manifest.agents.findIndex((a) => a.agent === agentNum);
  if (existing >= 0) manifest.agents[existing] = entry;
  else manifest.agents.push(entry);
  manifest.agents.sort((a, b) => a.agent - b.agent);
  writeManifest();

  console.log(`[launch-happ] Agent ${agentNum} ready → ${appWsUrl} (hc-connection.json updated)`);
  console.log(
    `[launch-happ] Agent ${agentNum}: open http://localhost:${uiPortForAgent(agentNum)} ` +
    `(dedicated port = isolated agent).`
  );
}

/**
 * Opens a URL in the default browser (best-effort, non-fatal). Disable with
 * NO_OPEN=1 (useful for headless/CI runs).
 */
function openBrowser(url) {
  if (process.env.NO_OPEN === '1') return;
  try {
    if (process.platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    } else if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    } else {
      spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
    }
  } catch (error) {
    console.error(`[launch-happ] Could not auto-open ${url} (open it manually):`, error);
  }
}

/**
 * Starts one Vite dev server per agent, each on its own port and pinned to its
 * conductor via VITE_DEV_AGENT. Separate ports = separate origins = isolated
 * localStorage, so each window is a fully independent agent with clean URLs.
 * A browser tab is auto-opened for each agent once its server is listening.
 */
function startUiServers() {
  for (let i = 0; i < agents; i += 1) {
    const agentNum = i + 1;
    const port = uiPortForAgent(agentNum);
    // Run the `ui` workspace's own `start` script with bun (not npm: the
    // workspace tooling is bun, and `--filter` is bun-only). Running from the ui
    // directory avoids needing a workspace filter at all.
    const proc = spawn('bun', ['run', 'start'], {
      cwd: uiDir,
      env: { ...process.env, UI_PORT: String(port), VITE_DEV_AGENT: String(agentNum) },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    uiProcs.push(proc);

    let opened = false;
    pipeLines(proc, `ui:agent${agentNum}`, (line) => {
      if (opened) return;
      // Vite prints e.g. "➜  Local:   http://localhost:5173/" once listening.
      const match = line.match(/Local:\s+(https?:\/\/\S+)/);
      if (match) {
        opened = true;
        const url = match[1].replace(/\/+$/, '');
        console.log(`[launch-happ] Agent ${agentNum} UI ready → ${url} (opening browser tab)`);
        uiReadyPorts.set(agentNum, port);
        maybeWriteReadyFile();
        openBrowser(match[1]);
      }
    });
    proc.on('error', (error) =>
      console.error(`[launch-happ] UI server for agent ${agentNum} failed to start:`, error)
    );
    console.log(
      `[launch-happ] Agent ${agentNum} UI dev server starting on http://localhost:${port} (VITE_DEV_AGENT=${agentNum})`
    );
  }
}

function shutdown(code = 0) {
  for (const proc of uiProcs) proc.kill('SIGTERM');
  playgroundProc?.kill('SIGTERM');
  sandboxProc?.kill('SIGTERM');
  bootstrapProc?.kill('SIGTERM');
  process.exit(code);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}

try {
  if (isE2E) {
    // Fresh, isolated e2e sandbox dir every run (equivalent of `hc sandbox
    // clean` for the dev path — sandboxes, keystore, and `.hc` index all live
    // here). Only sandbox/ and ready.json are wiped: the workdir root holds
    // globalSetup-owned files (launcher.log, .launcher.pid).
    fs.rmSync(e2eSandboxDir, { recursive: true, force: true });
    fs.rmSync(readyPath, { force: true });
    fs.mkdirSync(e2eSandboxDir, { recursive: true });
    console.log(`[launch-happ] E2E mode: sandbox workdir ${e2eSandboxDir}`);
  }
  console.log(`[launch-happ] Starting ${agents} conductor(s) with path-based install (${happPath})`);
  // Start the per-agent UI servers up front; each polls /hc-connection.json and
  // waits until its conductor is ready, so the user can open them immediately.
  startUiServers();
  const { bootstrapUrl } = await startBootstrapServer();
  console.log(`[launch-happ] Bootstrap: ${bootstrapUrl}`);

  const appPorts = [];
  for (let i = 0; i < agents; i += 1) {
    appPorts.push(await allocatePort());
  }
  console.log(`[launch-happ] App interface ports: ${appPorts.join(', ')}`);

  const portsInfo = await startSandboxes(agents, bootstrapUrl, appPorts);

  await Promise.all(
    Object.entries(portsInfo).map(([agentKey, ports]) =>
      installHappOnConductor(Number.parseInt(agentKey, 10), ports)
    )
  );

  conductorsInstalled = true;
  maybeWriteReadyFile();

  if (isE2E && process.env.E2E_PLAYGROUND === '1') {
    // Optional interactive DHT inspector alongside the e2e run.
    playgroundProc = spawn('hc', ['playground'], { cwd: sandboxCwd, stdio: ['ignore', 'pipe', 'pipe'] });
    pipeLines(/** @type {any} */ (playgroundProc), 'hc playground');
    playgroundProc.on('error', (error) =>
      console.error('[launch-happ] hc playground failed to start:', error)
    );
  }

  console.log('[launch-happ] All conductors installed. Press Ctrl+C to stop.');
} catch (error) {
  console.error('[launch-happ] Failed:', error);
  shutdown(1);
}
