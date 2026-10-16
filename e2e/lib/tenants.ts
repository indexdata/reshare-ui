import { test as base, type Browser, type Page, type TestInfo } from '@playwright/test';
import { own, peer, type Tenant } from './env';
import { login } from './stripes';

// Two institutions in one test: a logged-in page for each, in separate browser
// contexts so their sessions do not meet. The runner traces a context made by
// hand as the config says, both institutions in the one trace. Its video
// handling, though, is tied to its own page fixture: recording, retention and
// the annotations drawn into the video are all done here instead.
export const test = base.extend<{ ownPage: Page; peerPage: Page }>({
  ownPage: async ({ browser }, use, testInfo) => withSession(browser, own, 'own', use, testInfo),
  peerPage: async ({ browser }, use, testInfo) => withSession(browser, peer, 'peer', use, testInfo),
});

// A test.step whose title is also captioned on every recorded institution
// page while the step runs, so a video says what it is showing. The runner's
// `video.show.test` does this for its own page fixture only. Steps do not nest:
// an inner step's caption would be drawn over the outer one's.
export async function step<T>(title: string, body: () => Promise<T>): Promise<T> {
  return test.step(title, async () => {
    const pages = recordedPages.get(test.info()) ?? [];
    const captions = await Promise.all(pages.map((page) => page.screencast.showOverlay(caption(title))));
    try {
      return await body();
    } finally {
      // a page that crashed mid-step has nothing left to dispose
      await Promise.allSettled(captions.map((c) => c.dispose()));
    }
  });
}

const recordedPages = new WeakMap<TestInfo, Page[]>();

function caption(title: string): string {
  const text = title.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]!);
  return `<div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);max-width:90%;` +
    `padding:4px 10px;border-radius:4px;background:rgba(0,0,0,.6);color:#fff;` +
    `font:16px/1.3 sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${text}</div>`;
}

async function withSession(
  browser: Browser,
  tenant: Tenant,
  name: string,
  use: (page: Page) => Promise<void>,
  testInfo: TestInfo,
) {
  const { video } = testInfo.project.use;
  const videoMode = typeof video === 'object' ? video.mode : video;
  const videoOn = videoMode === 'on' || videoMode === 'retain-on-failure';
  const context = await browser.newContext({
    baseURL: tenant.baseURL,
    recordVideo: videoOn ? { dir: testInfo.outputPath(`video-${name}`) } : undefined,
  });
  let page: Page | undefined;
  try {
    page = await context.newPage();
    if (videoOn) {
      await page.screencast.showActions(typeof video === 'object' ? video.show?.actions : undefined);
      recordedPages.set(testInfo, [...(recordedPages.get(testInfo) ?? []), page]);
    }
    await page.goto('/');
    await login(page, tenant);
    await use(page);
  } finally {
    await context.close();
    const video = page?.video();
    if (video) {
      if (videoMode === 'on' || testInfo.status !== testInfo.expectedStatus) {
        await testInfo.attach(`video-${name}`, { path: await video.path(), contentType: 'video/webm' });
      } else {
        await video.delete();
      }
    }
  }
}

export { expect } from '@playwright/test';
