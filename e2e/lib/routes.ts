import type { Locator, Page } from '@playwright/test';

// Assert route-owned landmarks, independent of existing records.
export interface SmokeRoute {
  name: string; // used in test titles
  path: string;
  landmark: (page: Page) => Locator;
}

export const smokeRoutes: SmokeRoute[] = [
  {
    // #requests is the PersistedPaneset holding the search/filter pane and
    // the results MCL (PatronRequests.js) — same id on both sides
    name: 'requests list (borrowing)',
    path: '/request/requests',
    landmark: (p) => p.locator('#requests'),
  },
  {
    name: 'create request form',
    path: '/request/requests/create',
    landmark: (p) => p.locator('[name="bibliographicInfo.title"]'),
  },
  {
    name: 'requests list (lending)',
    path: '/supply/requests',
    landmark: (p) => p.locator('#requests'),
  },
  {
    name: 'scheduled actions settings',
    // settings mount comes from the module name (@projectreshare/rs → /settings/rs)
    path: '/settings/rs/scheduled-actions',
    landmark: (p) => p.locator('#clickable-new-scheduled-action'),
  },
];
