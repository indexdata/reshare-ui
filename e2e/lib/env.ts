// Captive defaults; override these values for an existing environment.
export interface Tenant {
  baseURL: string;
  username: string;
  password: string;
  symbol: string;
}

export const own: Tenant = {
  baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
  username: process.env.E2E_USERNAME ?? 'e2e',
  password: process.env.E2E_PASSWORD ?? 'e2e',
  symbol: process.env.E2E_SYMBOL ?? 'ISIL:US-TEST1',
};

// A second institution that requests from, or supplies to, the first.
export const peer: Tenant = {
  baseURL: process.env.E2E_PEER_BASE_URL ?? 'http://localhost:3002',
  username: process.env.E2E_PEER_USERNAME ?? 'e2e',
  password: process.env.E2E_PEER_PASSWORD ?? 'e2e',
  symbol: process.env.E2E_PEER_SYMBOL ?? 'ISIL:US-TEST2',
};

// External workflows need an available supplier item and a valid borrower patron.
export const item = {
  id: process.env.E2E_ITEM_ID ?? 'e2e-item',
  barcode: process.env.E2E_ITEM_BARCODE ?? 'e2e-barcode',
  title: process.env.E2E_ITEM_TITLE ?? 'E2E workflow title',
  author: process.env.E2E_ITEM_AUTHOR ?? 'E2E Author',
};
// Borrower's pickup branch and the shipping address sent to the lender.
export const pickupLocation = {
  name: process.env.E2E_PICKUP_LOCATION ?? 'Test1 Main Library',
  street: process.env.E2E_PICKUP_STREET ?? '1 Main Street',
};
export const patron = {
  id: process.env.E2E_PATRON_ID ?? 'p12345',
};
// The captive stack's external supplier, driven by illmock, under the symbol
// seed/directory.json gives it. Only captive specs use it; a rota that ends
// here cannot run against an existing system.
export const illmock = {
  symbol: 'ISIL:US-MOCK',
};
