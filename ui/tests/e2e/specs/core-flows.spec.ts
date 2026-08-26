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
import type { CellId } from '@holochain/client';
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
  expectEmptyLobby,
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

/**
 * Per-cell DHT read-back: enumerates the agent's `ndo` clone cells (created at
 * runtime by the UI) and reads the live NondominiumIdentity from the matching
 * cell. Replaces the pre-per-cell shared-cell `get_all_ndos` read-back — UI
 * NDOs now live on their own clone, not the shared nondominium cell. The seed
 * client shares agent 1's app, so UI-created clones are visible in its appInfo;
 * each needs signing credentials authorized before the zome call.
 */
async function readLiveNdoFromCloneCells(
  seed: SeedClient,
  name: string
): Promise<NdoOutput | undefined> {
  const info = await seed.app.appInfo();
  for (const c of info.cell_info.ndo ?? []) {
    const ci = c as unknown as {
      type?: string;
      value?: { cell_id: CellId };
      cloned?: { cell_id: CellId };
    };
    const cellId = ci.type === 'cloned' ? ci.value?.cell_id : ci.cloned?.cell_id;
    if (!cellId) continue;
    await authorizeWithRetry(seed.admin, cellId);
    try {
      const out = (await seed.app.callZome({
        cell_id: cellId,
        zome_name: 'zome_resource',
        fn_name: 'get_all_ndos',
        payload: null
      })) as GetAllNdosOutput;
      const found = out.ndos.find((n) => n.entry.name === name);
      if (found) return found;
    } catch {
      // Cell not yet ready / disabled — try the next clone.
    }
  }
  return undefined;
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
    try {
      const myGroup = await seed.app.callZome({
        cell_id: clone.cell_id,
        zome_name: 'zome_group',
        fn_name: 'get_my_group',
        payload: null
      });
      expect(myGroup).toBeNull();
    } finally {
      // The UI enumerates group clone cells straight off appInfo, so a leftover
      // guard clone shows up in the sidebar as a real group and makes the next
      // test's "empty lobby" precondition false. Tear it down here — the guard
      // owns this cell, nothing downstream should see it.
      await seed.app.disableCloneCell({
        clone_cell_id: { type: 'dna_hash', value: clone.cell_id[0] }
      });
      await seed.admin.deleteCloneCell({
        app_id: seed.appId,
        clone_cell_id: { type: 'dna_hash', value: clone.cell_id[0] }
      });
    }
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
    // The CTA only renders when the agent has no groups, so the emptiness is a
    // precondition rather than part of what is under test. Assert it first —
    // when it breaks, the message should say so.
    await expectEmptyLobby(page);
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
    // NondominiumIdentity on the NDO's own clone cell (per-cell model A).
    const widget = await readLiveNdoFromCloneCells(seed, 'E2E Widget');
    expect(widget).toBeTruthy();
    expect(widget?.entry.lifecycle_stage).toBe('Ideation');
    // NdoAnchor on the group clone cell is the authoritative group→NDO pointer;
    // cross-agent anchor visibility is covered by multi-agent.spec.ts.
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

    // DHT read-back: the transition is on the NDO's clone cell, not just in the UI.
    const widget = await readLiveNdoFromCloneCells(seed, 'E2E Widget');
    expect(widget?.entry.lifecycle_stage).toBe('Specification');
  });

  test('lifecycle history lists the Ideation to Specification transition', async () => {
    // The backend landed in `get_ndo_transition_history` (REQ-UI-NDO-04), so this
    // asserts the row rather than the stub copy it replaced. The old assertion
    // outlived the absence it was written for and went red the moment the feature
    // arrived, which is the point of replacing it here rather than relaxing it.
    //
    // The reload is load-bearing: TransitionHistoryPanel fetches `onMount` only,
    // and the transition in the previous test happened after this page mounted,
    // so the row is on the DHT but not in this component's state. Reloading
    // remounts it. The onMount-only load is a tracked follow-up, not a defect,
    // and this comment is here so a future reader does not delete the reload as
    // redundant.
    await page.reload();

    const historyToggle = page.getByText(/Lifecycle history/);
    await expect(historyToggle).toBeVisible();
    await historyToggle.click();

    const row = page.locator('li').filter({ hasText: 'Ideation' }).filter({
      hasText: 'Specification'
    });
    await expectEventually(page, async () => {
      await expect(row.first()).toBeVisible();
    });

    // Hashes must render base64-encoded, not as the raw byte array the conductor
    // returns (PR #132, F9). `.slice` on a Uint8Array is legal TypeScript, so the
    // compiler cannot catch a regression here and only a rendered assertion can.
    const rowText = (await row.first().innerText()).replace(/\s+/g, ' ');
    expect(rowText).toMatch(/uhC/);
    expect(rowText).not.toMatch(/\d{1,3},\d{1,3},\d{1,3}/);
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
