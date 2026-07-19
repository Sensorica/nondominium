import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isCI = !!process.env.CI;

/**
 * E2E suite against REAL Holochain conductors (no mocks).
 *
 * globalSetup spawns scripts/launch-happ.mjs in E2E mode: 2 conductors + 2 Vite
 * dev servers, one origin per agent (ports 6173/6174 — distinct from the dev
 * network's 5173/5174 so leftover-process port guards can never hit a dev
 * session). Holochain state is shared and ordered, so specs run sequentially on
 * a single worker; test files are ordered stories, not independent units.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,

  reporter: [
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
    ['list', { printSteps: true }],
    ['junit', { outputFile: 'test-results/junit.xml', includeProjectInTestName: true }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ...(isCI ? ([['github']] as ['github'][]) : [])
  ],

  globalSetup: join(__dirname, 'tests/setup/global-setup.ts'),
  globalTeardown: join(__dirname, 'tests/setup/global-teardown.ts'),

  // Conductor cold start + first-connect signing authorization are slow;
  // two-agent gossip assertions double every budget. CI gets 2x local.
  timeout: isCI ? 240_000 : 120_000,
  expect: { timeout: isCI ? 30_000 : 15_000 },

  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: isCI ? 30_000 : 15_000,
    navigationTimeout: isCI ? 60_000 : 30_000,
    ...(isCI ? { reducedMotion: 'reduce' as const, colorScheme: 'light' as const } : {})
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            ...(isCI ? ['--headless=new', '--disable-gpu', '--no-first-run'] : [])
          ]
        }
      }
    }
  ],

  outputDir: 'test-results/artifacts'
});
