/**
 * Phase 2: two-agent flows — the differentiator over Sweettest. Two browser
 * contexts on two origins (isolated localStorage = independent Level 1/2
 * identity), one conductor each, gossiping through the local bootstrap server.
 *
 * Cross-agent state is eventually consistent: every cross-agent assertion
 * polls via expectEventually, which drives the UI's own pull-refresh
 * (focus/visibility triggers + the ~8s poll in GroupView — REQ-UI-GRP-05)
 * rather than raw page reloads.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  createGroup,
  createNdo,
  ensureLobbyProfile,
  expectEventually,
  gotoAgent,
  installClipboardCapture,
  readCopiedText,
  saveGroupProfileIfPrompted
} from '../utils/e2e-helpers.js';

const GROUP_NAME = 'Shared Circle';
const NDO_NAME = 'Shared NDO';

function memberRows(page: Page) {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Members', exact: true }) })
    .locator('ul li');
}

test.describe.serial('nondominium multi-agent flows', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let alice: Page; // agent 1
  let bob: Page; // agent 2
  let inviteLink = '';

  test.beforeAll(async ({ browser }) => {
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    alice = await context1.newPage();
    bob = await context2.newPage();
    await installClipboardCapture(alice);
  });

  test.afterAll(async () => {
    await context1?.close();
    await context2?.close();
  });

  test('agent 1 creates a group and copies the invite link', async () => {
    await gotoAgent(alice, 1);
    await ensureLobbyProfile(alice, 'Alice');
    await createGroup(alice, GROUP_NAME);

    await alice.getByRole('button', { name: 'Copy invite link' }).click();
    await expect(alice.getByRole('button', { name: 'Invite link copied!' })).toBeVisible();
    inviteLink = await readCopiedText(alice);
    expect(inviteLink).toContain('?group=');
  });

  test('agent 2 joins via the invite link without a reload', async () => {
    await gotoAgent(bob, 2);
    await ensureLobbyProfile(bob, 'Bob');

    // Scoped to the sidebar nav — the empty-lobby onboarding CTA also renders
    // a "Join group" button.
    await bob.locator('nav').getByRole('button', { name: 'Join Group' }).click();
    await bob.getByPlaceholder('Paste invite link').fill(inviteLink);
    await bob.getByRole('button', { name: 'Join', exact: true }).click();

    // REQ-UI-GRP-02: the joined group appears and navigates without a reload
    // (gossip-retry on get_my_group with an invite-payload fallback).
    await bob.waitForURL(/\/group\/[^/]+$/, { timeout: 120_000 });
    await saveGroupProfileIfPrompted(bob);
    await expect(bob.getByRole('heading', { name: GROUP_NAME, exact: true })).toBeVisible({
      timeout: 60_000
    });
  });

  test('member lists converge on both agents (self-heal)', async () => {
    // Fresh clone-cell DHT spaces need peer discovery via the bootstrap server
    // before membership links gossip across — budget generously, and keep the
    // test timeout above the combined polling budgets.
    test.setTimeout(420_000);
    // REQ-UI-GRP-04: joining commits membership best-effort; ensureMembership
    // reconciles on open, and cross-member visibility rides DHT gossip.
    //
    // The silent focus/poll refresh path deliberately skips ensureMembership,
    // so if bob's join-time commit missed (GroupProfile not yet gossiped within
    // its ~2.4s retry window), only RE-OPENING the group view reconciles it.
    // The fallback below emulates that user action — tracked as issue #119;
    // once fixed, this test should pass without the fallback.
    const converged = (page: Page) => async () => {
      expect(await memberRows(page).count()).toBeGreaterThanOrEqual(2);
    };
    const reopenGroup = async (page: Page) => {
      await page.goto(page.url());
      await saveGroupProfileIfPrompted(page);
    };
    for (const page of [bob, alice]) {
      try {
        await expectEventually(page, converged(page), { timeoutMs: 60_000 });
      } catch {
        await reopenGroup(page);
        await expectEventually(page, converged(page), { timeoutMs: 120_000 });
      }
    }
  });

  test('NDO created by agent 1 becomes visible to agent 2', async () => {
    test.setTimeout(300_000);
    await createNdo(alice, { name: NDO_NAME, nature: 'Physical', stage: 'Ideation' });
    await expectEventually(alice, async () => {
      await expect(alice.getByRole('heading', { name: NDO_NAME })).toBeVisible();
    });

    // REQ-UI-GRP-05: agent 2 picks the card up via the UI's own pull refresh.
    await expectEventually(
      bob,
      async () => {
        await expect(bob.getByRole('heading', { name: NDO_NAME })).toBeVisible();
      },
      { timeoutMs: 180_000 }
    );
  });

  test('agent 2 opens the NDO detail (derives the ndo cell from anchor coordinates)', async () => {
    test.setTimeout(240_000);
    // Bob never created this NDO and has not joined its cell. Opening the detail
    // resolves the ndo clone cell from the NdoAnchor coordinates
    // (ensureNdoCloneCell) and reads the live identity via get_ndo.
    await bob.getByRole('heading', { name: NDO_NAME }).click();
    await bob.waitForURL(/\/ndo\//);
    await expect(bob.getByRole('heading', { name: NDO_NAME })).toBeVisible({ timeout: 90_000 });
    await expect(bob.getByText('Lifecycle stage')).toBeVisible();
  });

  test('lifecycle transition by agent 1 is read live by agent 2 from the ndo cell', async () => {
    test.setTimeout(360_000);
    // Alice (the initiator) advances Ideation → Specification on her ndo cell.
    await expectEventually(alice, async () => {
      await expect(alice.getByRole('heading', { name: NDO_NAME })).toBeVisible();
    });
    await alice.getByRole('heading', { name: NDO_NAME }).click();
    await alice.waitForURL(/\/ndo\//);
    await expect(alice.getByRole('button', { name: 'Advance stage →' })).toBeVisible({
      timeout: 90_000
    });
    await alice.getByRole('button', { name: 'Advance stage →' }).click();
    await expect(alice.getByRole('heading', { name: 'Advance lifecycle stage' })).toBeVisible();
    await alice.getByRole('radio', { name: 'Specification' }).check();
    await alice.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(alice.getByRole('heading', { name: 'Advance lifecycle stage' })).toBeHidden({
      timeout: 60_000
    });

    // Bob reloads the open NDO detail; the live read from the ndo cell must show
    // Specification. The group NdoAnchor cache is NOT refreshed on transition in
    // v0.1.0, so bob's card would still show Ideation — only a real live-cell
    // read can surface the new stage, which is what this asserts.
    await expectEventually(
      bob,
      async () => {
        // Target the identity panel's stage field by test id, not by text: with
        // Layer 1 activated, "Specification" also appears in the Layer 1 panel
        // and its create modal, so a bare text match is a strict-mode violation.
        await expect(bob.getByTestId('ndo-lifecycle-stage')).toHaveText('Specification', {
          timeout: 5_000
        });
      },
      { timeoutMs: 240_000, pollMs: 6_000, onPoll: async () => { await bob.reload(); } }
    );
  });

  test('both agents join the NDO and see each other in the member list', async () => {
    test.setTimeout(360_000);

    // Membership is an explicit act: creating the NDO did not make alice a member.
    // Both agents are already on the NDO detail page from the previous tests.
    for (const page of [alice, bob]) {
      await page.getByRole('button', { name: 'Join NDO' }).click();
      await page.getByRole('button', { name: 'Join this NDO' }).click();
      await expect(page.getByText('You have joined this NDO.')).toBeVisible({ timeout: 90_000 });
    }

    // Each agent's own membership commits locally, so it appears immediately; the
    // peer's membership arrives by gossip, which is what the poll waits for. This is
    // the assertion that fails if get_ndo_members ever fetches the linked record
    // instead of reading the link author — the peer's record may not be held here.
    for (const page of [alice, bob]) {
      await expectEventually(
        page,
        async () => {
          await expect(page.getByTestId('member-row')).toHaveCount(2, { timeout: 5_000 });
        },
        {
          timeoutMs: 240_000,
          pollMs: 6_000,
          onPoll: async () => {
            await page.reload();
            await page.getByRole('button', { name: 'Join NDO' }).click();
          }
        }
      );
    }
  });
});
