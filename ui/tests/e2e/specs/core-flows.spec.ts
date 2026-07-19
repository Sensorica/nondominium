/**
 * Phase 0 (harness) + Phase 1 (single-agent core flows), ordered.
 *
 * One shared browser context tells one continuous story on agent 1's origin —
 * Holochain state is shared and ordered, so later tests build on earlier ones
 * and a failure skips the rest (test.describe.serial).
 *
 * Prerequisites are seeded via direct zome calls (seeding client); the flow
 * under test always runs through the real UI. DHT read-backs through the
 * seeding client double as playground-equivalent verification that the UI
 * actually landed entries on the DHT.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  authorizeWithRetry,
  createSeedClient,
  type SeedClient
} from '../../setup/harness.js';
import {
  agentBaseUrl,
  callZome,
  createGroup,
  createNdo,
  ensureLobbyProfile,
  expectEventually,
  gotoAgent
} from '../utils/e2e-helpers.js';

interface NdoOutput {
  action_hash: Uint8Array;
  entry: { name: string; lifecycle_stage: string; resource_nature: string };
}
interface GetAllNdosOutput {
  ndos: NdoOutput[];
}

test.describe.serial('nondominium core flows', () => {
  let context: BrowserContext;
  let page: Page; // agent 1, one continuous story
  let seed: SeedClient;
  let groupId = '';

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    seed = await createSeedClient(1);
  });

  test.afterAll(async () => {
    await seed?.close();
    await context?.close();
  });

  // ── Phase 0: harness ──────────────────────────────────────────────────────

  test('agent 1: app loads and connects', async () => {
    await gotoAgent(page, 1);
    await expect(page.getByRole('heading', { name: 'Browse NDOs' })).toBeVisible();
  });

  test('agent 2: app loads and connects on its own origin', async ({ browser }) => {
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    try {
      await gotoAgent(page2, 2);
      await expect(page2.getByRole('heading', { name: 'Browse NDOs' })).toBeVisible();
    } finally {
      await context2.close();
    }
  });

  test('zome call succeeds on a provisioned cell', async () => {
    const pong = await callZome<string>(seed, 'nondominium', 'misc', 'ping', null);
    expect(pong).toBe('Pong');
  });

  test('zome call succeeds on a runtime-cloned cell (signing regression guard)', async () => {
    // Group/NDO cells are created at runtime; a NoSigningCredentials regression
    // here silently breaks every flow downstream, so it gets a dedicated guard.
    const clone = await seed.app.createCloneCell({
      role_name: 'group',
      modifiers: { network_seed: `e2e-clone-guard-${Date.now()}` }
    });
    await authorizeWithRetry(seed.admin, clone.cell_id);
    const myGroup = await seed.app.callZome({
      cell_id: clone.cell_id,
      zome_name: 'zome_group',
      fn_name: 'get_my_group',
      payload: null
    });
    expect(myGroup).toBeNull();
  });

  // ── Phase 1: single-agent core flows ──────────────────────────────────────

  test('first-launch profile modal saves nickname to the sidebar', async () => {
    // REQ-UI-ID-01 (Level 1 identity, localStorage only).
    // TODO(#114): once the Lobby DNA profile sync merges, additionally assert
    // the Escape guard and read back a LobbyAgentProfile via the seeding
    // client (`zome_lobby_coordinator.get_all_lobby_agents`).
    await gotoAgent(page, 1);
    await ensureLobbyProfile(page, 'Agent One');
  });

  test('empty lobby shows the create-or-join onboarding CTA', async () => {
    await expect(page.getByText('Create or join a group to see NDOs')).toBeVisible();
  });

  test('create group: clone cell provisioned, group view rendered, creator listed', async () => {
    groupId = await createGroup(page, 'E2E Circle');
    // Membership is committed best-effort over a gossiping DHT and self-healed
    // on load (REQ-UI-GRP-04) — poll rather than assert once.
    const memberRows = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Members', exact: true }) })
      .locator('ul li');
    await expectEventually(page, async () => {
      expect(await memberRows.count()).toBeGreaterThanOrEqual(1);
    });
  });

  test('create NDO from the group: card appears in the group grid', async () => {
    await createNdo(page, {
      name: 'E2E Widget',
      regime: 'Commons',
      nature: 'Digital',
      stage: 'Ideation',
      description: 'Widget created by the e2e suite'
    });
    await expectEventually(page, async () => {
      await expect(page.getByRole('heading', { name: 'E2E Widget' })).toBeVisible();
    });

    // Playground-equivalent DHT verification: the UI flow must have landed a
    // NondominiumIdentity entry readable via a direct zome call.
    const out = await callZome<GetAllNdosOutput>(seed, 'nondominium', 'zome_resource', 'get_all_ndos', null);
    const widget = out.ndos.find((n) => n.entry.name === 'E2E Widget');
    expect(widget).toBeTruthy();
    expect(widget?.entry.lifecycle_stage).toBe('Ideation');
    // TODO(#117): once NDO-per-cell + NdoAnchor merge, assert the card renders
    // from the anchor cache (solid border) and read the NdoAnchor back via the
    // seeding client instead of the shared-DHT entry.
  });

  test('created NDO appears in the Lobby grid', async () => {
    await gotoAgent(page, 1);
    await expectEventually(page, async () => {
      await expect(page.getByRole('heading', { name: 'E2E Widget' })).toBeVisible();
    });
  });

  test('NDO detail renders identity fields and transitions Ideation → Specification', async () => {
    await page.getByRole('heading', { name: 'E2E Widget' }).click();
    await page.waitForURL(/\/ndo\//);

    await expect(page.getByRole('heading', { name: 'E2E Widget' })).toBeVisible();
    await expect(page.getByText('Property regime')).toBeVisible();
    await expect(page.getByText('Resource nature')).toBeVisible();
    await expect(page.getByText('Lifecycle stage')).toBeVisible();

    // Lifecycle transition (initiator-only button).
    await page.getByRole('button', { name: 'Advance stage →' }).click();
    await expect(page.getByRole('heading', { name: 'Advance lifecycle stage' })).toBeVisible();
    await page.getByRole('radio', { name: 'Specification' }).check();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Advance lifecycle stage' })).toBeHidden({
      timeout: 30_000
    });

    await expectEventually(page, async () => {
      await expect(
        page.getByText('Specification', { exact: true }).first()
      ).toBeVisible();
    });

    // DHT read-back: the transition is on chain, not just in the UI.
    const out = await callZome<GetAllNdosOutput>(seed, 'nondominium', 'zome_resource', 'get_all_ndos', null);
    const widget = out.ndos.find((n) => n.entry.name === 'E2E Widget');
    expect(widget?.entry.lifecycle_stage).toBe('Specification');
  });

  test('lifecycle history panel present (backend rows pending)', async () => {
    const historyToggle = page.getByText(/Lifecycle history/);
    await expect(historyToggle).toBeVisible();
    await historyToggle.click();
    // TODO(backend Phase 2.3): `get_ndo_transition_history` is not implemented
    // in zome_resource on dev — assert the explicit stub state today, and
    // replace with a from→to row assertion when the backend lands.
    await expect(page.getByText('No transitions recorded.')).toBeVisible();
  });

  test('filter chips: OR within a dimension, AND across dimensions', async () => {
    // Second NDO with a different nature/stage so filters can discriminate.
    // (Created through the UI on purpose: filtering is the thing under test.)
    await gotoAgent(page, 1, `/group/${encodeURIComponent(groupId)}`);
    await createNdo(page, { name: 'E2E Method', nature: 'Information', stage: 'Ideation' });

    await gotoAgent(page, 1);
    await expectEventually(page, async () => {
      await expect(page.getByRole('heading', { name: 'E2E Method' })).toBeVisible();
    });

    // OR within Nature: Digital → only the widget.
    await page.getByRole('button', { name: 'Digital', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'E2E Widget' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'E2E Method' })).toBeHidden();

    // Digital OR Information → both.
    await page.getByRole('button', { name: 'Information', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'E2E Widget' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'E2E Method' })).toBeVisible();

    // AND across dimensions: + Stage=Specification → only the widget.
    await page.getByRole('button', { name: 'Specification', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'E2E Widget' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'E2E Method' })).toBeHidden();

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByRole('heading', { name: 'E2E Method' })).toBeVisible();
  });

  test('connection failure surfaces error state with a working retry', async ({ browser }) => {
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    try {
      // Force a fast failure by serving a manifest that points at a dead
      // conductor (aborting the route would instead hit the manifest wait
      // loop's 300s budget).
      await page2.route('**/hc-connection.json', (route) =>
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            appId: 'nondominium',
            agents: [{ agent: 1, adminWsUrl: 'ws://localhost:9', appWsUrl: 'ws://localhost:9' }]
          })
        })
      );
      await page2.goto(`${agentBaseUrl(1)}/`);
      await expect(page2.getByText('Connection Failed')).toBeVisible({ timeout: 60_000 });

      await page2.unroute('**/hc-connection.json');
      await page2.getByRole('button', { name: 'Retry Connection' }).click();
      await expect(page2.getByRole('link', { name: 'Browse NDOs' })).toBeVisible({
        timeout: 90_000
      });
    } finally {
      await context2.close();
    }
  });
});
