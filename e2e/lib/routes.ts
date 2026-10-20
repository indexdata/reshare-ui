import type { Locator, Page } from '@playwright/test';
import { own } from './env';

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
  {
    name: 'message templates settings',
    path: '/settings/rs/templates',
    // same as scheduled actions: the empty message waits for the query
    landmark: (p) => p.locator('[data-row-inner]').or(p.getByText('No templates')).first(),
  },
  {
    // the preset picker loads separately and may fail without harming the form
    name: 'new scheduled action form',
    path: '/settings/rs/scheduled-actions/new',
    landmark: (p) => p.locator('[name="batchQuery"]'),
  },
  {
    name: 'new message template form',
    path: '/settings/rs/templates/new',
    landmark: (p) => p.locator('[name="title"]'),
  },
  {
    // the list opens filtered to institutions; #entries-list is its MCL
    name: 'directory entries list',
    path: '/directory/entries',
    landmark: (p) => p.locator('#entries-list'),
  },
  {
    name: 'new directory entry form',
    path: '/directory/entries/create',
    landmark: (p) => p.locator('[name="name"]'),
  },
  {
    // resolves the symbol and redirects to the entry, whose view alone has
    // the edit button; an unknown symbol renders the pane without it
    name: 'directory entry by symbol',
    path: `/directory/entries/by-symbol/${own.symbol}`,
    landmark: (p) => p.locator('#clickable-edit-entry'),
  },
  {
    name: 'update scan screen',
    path: '/update',
    landmark: (p) => p.locator('[name="hrid"]'),
  },
];
