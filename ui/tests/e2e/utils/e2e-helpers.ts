/**
 * Browser-side helpers for the e2e suite. Selectors target the dev-branch UI
 * (see specs for TODO markers tied to PRs #114/#117).
 */
import { expect, type Page } from '@playwright/test';
import { readReady, uiPortForAgent, type SeedClient } from '../../setup/harness.js';

export function agentBaseUrl(agent: number): string {
  try {
    const ready = readReady();
    const entry = ready.agents.find((a) => a.agent === agent);
    if (entry) return `http://localhost:${entry.uiPort}`;
  } catch {
    // Fall through to the computed port (ready.json is gone mid-teardown).
  }
  return `http://localhost:${uiPortForAgent(agent)}`;
}

/**
 * Navigate an agent's origin and wait for the Holochain connection. Each agent
 * has its own port (6173+agent-1) → its own origin → isolated localStorage,
 * pinned to its conductor via VITE_DEV_AGENT.
 */
export async function gotoAgent(page: Page, agent: number, path = '/'): Promise<void> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  await page.goto(`${agentBaseUrl(agent)}${cleanPath}`);
  await waitForConnection(page);
}

/**
 * Waits out HolochainProvider's "Connecting to Holochain..." overlay and for
 * the app shell to render. First connect authorizes signing credentials for
 * every cell (serialized source-chain commits), so the budget is generous.
 */
export async function waitForConnection(page: Page, timeoutMs = 90_000): Promise<void> {
  await expect(page.getByText('Connecting to Holochain...')).toBeHidden({ timeout: timeoutMs });
  await expect(page.getByText('Connection Failed')).toBeHidden({ timeout: 5_000 });
  await expect(page.getByRole('link', { name: 'Browse NDOs' })).toBeVisible({
    timeout: timeoutMs
  });
}

/**
 * Fires the UI's own pull-refresh triggers (GroupView listens on window focus /
 * visibilitychange) instead of reloading the page — this both speeds up
 * gossip-dependent assertions and exercises REQ-UI-GRP-05.
 */
export async function triggerUiRefresh(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

export interface EventuallyOptions {
  timeoutMs?: number;
  pollMs?: number;
  /** Called between attempts — defaults to triggering the UI pull-refresh. */
  onPoll?: () => Promise<void>;
}

/**
 * Gossip-aware polling assertion: cross-agent state (memberships, NDO cards,
 * announcements) is eventually consistent, so the assertion is retried while
 * nudging the UI's own refresh path between attempts.
 */
export async function expectEventually(
  page: Page,
  assertion: () => Promise<void>,
  { timeoutMs = 60_000, pollMs = 2_000, onPoll }: EventuallyOptions = {}
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  for (;;) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      if (Date.now() >= deadline) throw lastError;
      await (onPoll ? onPoll() : triggerUiRefresh(page));
      await page.waitForTimeout(pollMs);
    }
  }
}

/**
 * Completes the first-launch Lobby profile modal (Level 1 identity) if it is
 * pending, otherwise verifies the nickname is already set. Idempotent — safe
 * to call at the start of any story.
 */
export async function ensureLobbyProfile(page: Page, nickname: string): Promise<void> {
  const modalTitle = page.getByText('Set up your Lobby profile');
  const nicknameInSidebar = page.locator('nav').getByText(nickname);

  const appeared = await modalTitle
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (appeared) {
    await page.locator('#lup-nickname').fill(nickname);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(modalTitle).toBeHidden();
  }
  await expect(nicknameInSidebar).toBeVisible({ timeout: 10_000 });
}

/** Dismisses the per-group disclosure modal (Level 2 identity) if present. */
export async function saveGroupProfileIfPrompted(page: Page): Promise<void> {
  const modalTitle = page.getByRole('heading', { name: 'Group profile' });
  const appeared = await modalTitle
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (appeared) {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(modalTitle).toBeHidden();
  }
}

/**
 * Creates a group through the sidebar and lands on /group/{seed}. Handles the
 * first-visit GroupProfileModal.
 */
export async function createGroup(page: Page, name: string): Promise<string> {
  // Scoped to the sidebar nav — the empty-lobby onboarding CTA renders
  // similarly-named buttons.
  await page.locator('nav').getByRole('button', { name: 'New Group' }).click();
  await page.getByPlaceholder('Group name').fill(name);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.waitForURL(/\/group\/[^/]+$/, { timeout: 60_000 });
  await saveGroupProfileIfPrompted(page);
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible({
    timeout: 30_000
  });
  const groupId = decodeURIComponent(page.url().split('/group/')[1]);
  return groupId;
}

export interface NdoFormInput {
  name: string;
  regime?: 'Private' | 'Commons' | 'Nondominium' | 'CommonPool';
  nature?: 'Physical' | 'Digital' | 'Service' | 'Hybrid' | 'Information';
  stage?: string;
  description?: string;
}

/**
 * Creates an NDO through the group view's NdoCreateModal (native selects, so
 * selectOption drives them directly).
 */
export async function createNdo(page: Page, input: NdoFormInput): Promise<void> {
  await page.getByRole('button', { name: '+ Create NDO' }).click();
  await expect(page.getByRole('heading', { name: 'Create NDO' })).toBeVisible();
  await page.locator('#ndo-name').fill(input.name);
  if (input.regime) await page.locator('#ndo-regime').selectOption(input.regime);
  if (input.nature) await page.locator('#ndo-nature').selectOption(input.nature);
  if (input.stage) await page.locator('#ndo-stage').selectOption(input.stage);
  if (input.description) await page.locator('#ndo-desc').fill(input.description);
  await page.getByRole('button', { name: 'Create NDO', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create NDO' })).toBeHidden({
    timeout: 60_000
  });
}

/**
 * Headless-deterministic clipboard capture: navigator.clipboard is replaced by
 * an in-page recorder BEFORE navigation. Real clipboard permissions in
 * headless Chromium are flaky; this is not the thing under test — the invite
 * payload is.
 */
export async function installClipboardCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const store = { text: '' };
    Object.defineProperty(window, '__copiedText', {
      get: () => store.text,
      configurable: true
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (text: string) => {
          store.text = text;
          return Promise.resolve();
        },
        readText: () => Promise.resolve(store.text)
      },
      configurable: true
    });
  });
}

export async function readCopiedText(page: Page): Promise<string> {
  return page.evaluate(() => (window as unknown as { __copiedText: string }).__copiedText);
}

/** Thin wrapper for direct zome calls through the seeding client. */
export async function callZome<T>(
  client: SeedClient,
  roleName: string,
  zomeName: string,
  fnName: string,
  payload: unknown
): Promise<T> {
  return (await client.app.callZome({
    role_name: roleName,
    zome_name: zomeName,
    fn_name: fnName,
    payload
  })) as T;
}
