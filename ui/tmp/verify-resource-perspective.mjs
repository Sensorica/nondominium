/**
 * Manual browser verification against a live `AGENTS=2 bun run network`.
 * Covers Lobby → Group Resource/Agent → NDO chrome → pool empty state.
 */
import { chromium } from 'playwright';

const AGENT1 = 'http://localhost:5173';
const AGENT2 = 'http://localhost:5174';
const stamp = Date.now().toString(36);
const GROUP_NAME = `RP Group ${stamp}`;
const NDO_NAME = `RP NDO ${stamp}`;

async function waitConnected(page) {
  // Initial paint can flash "Holochain not connected" before onMount starts
  // connecting — wait for the shell, not that transient string.
  await page.getByRole('link', { name: 'Browse NDOs' }).waitFor({ state: 'visible', timeout: 180_000 });
  const failed = await page.getByText('Connection Failed').isVisible().catch(() => false);
  if (failed) throw new Error('Holochain connection failed');
}

async function ensureLobbyProfile(page, nickname) {
  const dialog = page.getByRole('dialog', { name: /Lobby profile/i });
  const field = page.locator('#lup-nickname');
  const appeared = await field.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true).catch(() => false);
  if (appeared) {
    await field.fill(nickname);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 20_000 });
  }
}

async function saveGroupProfileIfPrompted(page) {
  const title = page.getByRole('heading', { name: 'Group profile' });
  const appeared = await title.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
  if (appeared) {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await title.waitFor({ state: 'hidden', timeout: 15_000 });
  }
}

async function createGroup(page, name) {
  await page.locator('nav').getByRole('button', { name: 'New Group' }).click();
  await page.getByPlaceholder('Group name').fill(name);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.waitForURL(/\/group\/[^/?]+/, { timeout: 90_000 });
  await saveGroupProfileIfPrompted(page);
  await page.getByTestId('group-perspectives-view').waitFor({ state: 'visible', timeout: 30_000 });
}

async function wizardCreateNdo(page, name) {
  // "Capture an idea" skips refinement: archetype → kernel → review.
  await page.getByRole('button', { name: '+ Create NDO' }).click();
  await page.getByText('What are you trying to do?').waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByRole('button', { name: /Capture an idea/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('#wizard-name').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('#wizard-name').fill(name);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Create NDO', exact: true }).click();
  await page.waitForURL(/\/ndo\//, { timeout: 120_000 });
  await page.getByTestId('ndo-resource-view').waitFor({ state: 'visible', timeout: 60_000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  const ctx1 = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write']
  });
  const page1 = await ctx1.newPage();
  page1.setDefaultTimeout(30_000);
  await page1.addInitScript(() => {
    const store = { text: '' };
    Object.defineProperty(window, '__copiedText', {
      get: () => store.text,
      configurable: true
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (text) => {
          store.text = text;
          return Promise.resolve();
        },
        readText: () => Promise.resolve(store.text)
      },
      configurable: true
    });
  });

  try {
    await page1.goto(AGENT1);
    await waitConnected(page1);
    results.push('agent1: connected');

    await ensureLobbyProfile(page1, `alice-${stamp}`);
    results.push('agent1: lobby profile');

    await createGroup(page1, GROUP_NAME);
    results.push('agent1: group created + perspectives host');

    // Resource perspective chrome
    await page1.getByTestId('pool-section').waitFor({ state: 'visible' });
    await page1.getByTestId('pool-empty').waitFor({ state: 'visible' });
    results.push('agent1: pool empty state on Resource view');

    await page1.locator('[data-testid="perspective-switcher"] button[data-perspective="agent"]').click();
    await page1.getByTestId('agent-perspective').waitFor({ state: 'visible', timeout: 20_000 });
    results.push('agent1: Agent directory');

    await page1.locator('[data-testid="perspective-switcher"] button[data-perspective="resource"]').click();
    await page1.getByTestId('pool-section').waitFor({ state: 'visible' });
    await wizardCreateNdo(page1, NDO_NAME);
    results.push('agent1: wizard created NDO + ResourceNdo chrome');

    // Tabs
    for (const tab of ['Overview', 'Resources', 'Governance', 'Composition', 'Activity']) {
      await page1.getByRole('button', { name: tab, exact: true }).click();
    }
    await page1.getByRole('button', { name: 'Composition', exact: true }).click();
    await page1.getByTestId('composition-tab').waitFor({ state: 'visible' });
    results.push('agent1: NDO tabs including Composition');

    // Intelligence/Work Soon — from group. Prefer a real group link (not "+ New NDO?createNdo=1").
    const groupPath =
      (await page1
        .locator('nav a[href^="/group/"]:not([href*="createNdo"])')
        .first()
        .getAttribute('href')) || '/';
    await page1.goto(new URL(groupPath, AGENT1).toString());
    await page1.getByTestId('group-perspectives-view').waitFor({ state: 'visible' });
    // Dismiss group-profile or create-wizard overlays that can reappear on remount.
    await saveGroupProfileIfPrompted(page1);
    for (let i = 0; i < 3; i++) {
      const cancel = page1.getByRole('button', { name: 'Cancel' });
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click();
        await page1.waitForTimeout(200);
      } else break;
    }
    await page1.keyboard.press('Escape').catch(() => null);
    await page1
      .locator('[data-testid="perspective-switcher"] button[data-perspective="intelligence"]')
      .click({ force: true });
    await page1.getByText(/Coming next|Soon|not available yet/i).first().waitFor({
      state: 'visible',
      timeout: 10_000
    });
    results.push('agent1: Soon popup for Intelligence');
    await page1.getByRole('button', { name: 'Got it' }).click({ timeout: 5_000 }).catch(async () => {
      await page1.keyboard.press('Escape').catch(() => null);
    });
    await page1.waitForTimeout(300);

    // Agent 2: connect + profile + join if invite available
    const ctx2 = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write']
    });
    const page2 = await ctx2.newPage();
    page2.setDefaultTimeout(60_000);
    await page2.goto(AGENT2);
    await waitConnected(page2);
    await ensureLobbyProfile(page2, `bob-${stamp}`);
    results.push('agent2: connected + profile');

    // Invite button is opacity-0 until group-row hover.
    const groupRow = page1.locator('nav li.group').first();
    await groupRow.hover();
    await page1.locator('nav button[title="Copy invite link"]').first().click({ force: true });
    const inviteText = await page1.evaluate(() => window.__copiedText || '');
    if (inviteText && inviteText.includes('group=')) {
      await page2.locator('nav').getByRole('button', { name: /Join Group/i }).click();
      const joinInput = page2.getByPlaceholder(/invite|paste|link/i).first();
      await joinInput.fill(inviteText);
      await page2.locator('nav').getByRole('button', { name: /^Join$/i }).click();
      await page2.waitForURL(/\/group\//, { timeout: 90_000 });
      await saveGroupProfileIfPrompted(page2);
      results.push('agent2: joined group via invite');
    } else {
      results.push(`agent2: invite missing (got ${JSON.stringify(inviteText.slice(0, 80))})`);
    }

    await ctx2.close();
    console.log(JSON.stringify({ ok: true, results, group: GROUP_NAME, ndo: NDO_NAME }, null, 2));
  } catch (err) {
    const shot = `/tmp/verify-rp-fail.png`;
    await page1.screenshot({ path: shot, fullPage: true }).catch(() => null);
    console.error(JSON.stringify({ ok: false, results, error: String(err), screenshot: shot }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
