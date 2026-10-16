import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// Prefer an explicit executable, then system Chromium, then Playwright's.
const systemChromium = '/usr/bin/chromium';
const chromiumExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
  (existsSync(systemChromium) ? systemChromium : undefined);

// E2E_SLOWMO=<ms> waits that long before every browser action, which makes a
// video watchable and the run slower. Never a default, not even for a video
// run: a slowed run has different timing from the one the suite is debugged
// against, and would pass or fail on its own account.
const slowMo = Number(process.env.E2E_SLOWMO) || undefined;

// External runs omit captive specs and need a named peer for workflows.
const external = Boolean(process.env.E2E_USERNAME);
const externalIgnore = [
  /\.captive\.spec\.ts$/,
  ...(process.env.E2E_PEER_BASE_URL ? [] : [/workflows\//]),
];

export default defineConfig({
  testDir: './tests',
  testIgnore: external ? externalIgnore : undefined,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    // A click or fill acts on a control that an earlier wait has already
    // brought on screen, so one that never appears fails here rather than at
    // the test timeout. What legitimately takes longer waits explicitly.
    actionTimeout: 15_000,
    launchOptions: { executablePath: chromiumExecutable, slowMo },
    // E2E_TRACE=on and E2E_VIDEO=on keep the trace and video of every test
    // rather than of failures only. E2E_AXE=on, read in lib/axe.ts, runs axe
    // at each checkpoint. Videos are annotated: the element acted on is
    // highlighted and the action named, and the current step is captioned.
    // The runner draws these on its own page fixture; lib/tenants.ts draws
    // the same on the institution pages.
    trace: process.env.E2E_TRACE === 'on' ? 'on' : 'retain-on-failure',
    video: {
      mode: process.env.E2E_VIDEO === 'on' ? 'on' : 'retain-on-failure',
      show: { actions: {}, test: { level: 'step', position: 'bottom' } },
    },
  },
  projects: [
    { name: 'smoke', testMatch: /smoke\/.*\.spec\.ts/, use: { browserName: 'chromium' } },
    { name: 'workflows', testMatch: /workflows\/.*\.spec\.ts/, use: { browserName: 'chromium' } },
  ],
});
