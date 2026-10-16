import type { Locator, Page } from '@playwright/test';

// Each landmark renders only once the route's data has loaded, so a failed
// query fails the visibility check instead of racing the error assertions.
// None depends on existing records.
export interface SmokeRoute {
  name: string; // used in test titles
  path: string;
  landmark: (page: Page) => Locator;
}

// The results pane's "N records found" subtitle, shown only on query success.
// #requests is the PersistedPaneset (PatronRequests.js), same id on both sides.
const requestsLoaded = (p: Page) => p.locator('#requests').getByText(/records found$/);

export const smokeRoutes: SmokeRoute[] = [
  {
    name: 'requests list (borrowing)',
    path: '/request/requests',
    landmark: requestsLoaded,
  },
  {
    name: 'create request form',
    path: '/request/requests/create',
    landmark: (p) => p.locator('[name="bibliographicInfo.title"]'),
  },
  {
    name: 'requests list (lending)',
    path: '/supply/requests',
    landmark: requestsLoaded,
  },
  {
    name: 'scheduled actions settings',
    // settings mount comes from the module name (@projectreshare/rs → /settings/rs)
    path: '/settings/rs/scheduled-actions',
    // a data row, or the empty message, which is blank until the query succeeds
    landmark: (p) => p.locator('[data-row-inner]').or(p.getByText('No scheduled actions')).first(),
  },
];
