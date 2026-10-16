import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Opt-in axe checkpoints. Soft assertions collect all findings in the report.
export const axeEnabled = process.env.E2E_AXE === 'on';

export async function checkA11y(page: Page, label: string) {
  if (!axeEnabled) return;
  const { violations } = await (await buildAxe(page)).analyze();
  if (violations.length) {
    await test.info().attach(`axe ${label}`, {
      body: JSON.stringify({ url: page.url(), violations }, null, 2),
      contentType: 'application/json',
    });
  }
  expect.soft(
    violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}x, e.g. ${v.nodes[0]?.target}`),
    `axe: ${label} at ${page.url()}`,
  ).toEqual([]);
}

// Single home for axe configuration and waivers. Runs the default ruleset.
// Findings stay red until waived here, by selector with .exclude() for one
// element or .disableRules() for a rule that is noisy everywhere, each entry
// commented with the owning code and the reason it is waived rather than
// fixed.
// Transitions are switched off first, which is not a waiver: it settles the
// page so axe reads finished styles. stripes-core's app list fades in from
// opacity 0, and axe arriving mid-fade reports color-contrast on nav labels
// that are fine once settled, a different subset of routes each run. Only
// transitions, never animations: an animation suppressed at its base style
// can leave an element at opacity 0, which axe skips as hidden.
async function buildAxe(page: Page): Promise<AxeBuilder> {
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important}' });
  return new AxeBuilder({ page })
    // Playwright's own video annotations (lib/tenants.ts, playwright.config.ts),
    // drawn into the page under this element; not part of the UI under test.
    .exclude('x-pw-glass');
}
