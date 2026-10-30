import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
p.setDefaultTimeout(60_000);
await p.goto('http://localhost:5173/');
await p.getByRole('link', { name: 'Browse NDOs' }).waitFor({ state: 'visible', timeout: 180_000 });

const nick = p.locator('#lup-nickname');
if (await nick.isVisible().catch(() => false)) {
  await nick.fill('wiz-alice');
  await p.getByRole('button', { name: 'Save', exact: true }).click();
}

const groupLink = p.locator('nav a[href^="/group/"]').first();
if (await groupLink.count()) {
  await groupLink.click();
} else {
  await p.locator('nav').getByRole('button', { name: 'New Group' }).click();
  await p.getByPlaceholder('Group name').fill('Wiz Group');
  await p.getByRole('button', { name: 'Create', exact: true }).click();
  await p.waitForURL(/\/group\//, { timeout: 90_000 });
}
const gp = p.getByRole('heading', { name: 'Group profile' });
if (await gp.isVisible().catch(() => false)) {
  await p.getByRole('button', { name: 'Save', exact: true }).click();
}
await p.getByTestId('group-perspectives-view').waitFor({ state: 'visible' });
await p.getByRole('button', { name: '+ Create NDO' }).click();
await p.waitForTimeout(1000);
console.log('HEADING', await p.locator('[role="dialog"], .fixed').first().innerText().catch(() => 'no dialog'));
const buttons = await p.getByRole('button').allTextContents();
console.log(
  'BUTTONS',
  buttons.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40)
);
await p.getByRole('button', { name: /Capture an idea/i }).click();
await p.waitForTimeout(500);
console.log('AFTER ARCHETYPE', await p.locator('body').innerText().then((t) => t.slice(0, 600)));
await p.getByRole('button', { name: 'Continue' }).click();
await p.waitForTimeout(500);
console.log('AFTER CONTINUE1 has name?', await p.locator('#wizard-name').count());
await p.locator('#wizard-name').fill('Wizard NDO Test');
await p.getByRole('button', { name: 'Continue' }).click();
await p.waitForTimeout(500);
console.log('STEP TEXT', await p.locator('body').innerText().then((t) => t.slice(0, 800)));
await p.screenshot({ path: '/tmp/wizard-step2.png', fullPage: true });
await b.close();
