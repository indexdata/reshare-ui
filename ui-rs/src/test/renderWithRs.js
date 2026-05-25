import React from 'react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { render } from '@folio/jest-config-stripes/testing-library/react';

// onError for IntlProvider: let assertions key off translation ids by swallowing
// only missing-translation noise, while still surfacing real formatting errors.
const ignoreMissingTranslations = (err) => {
  if (err.code === 'MISSING_TRANSLATION') return;
  throw err;
};

// Fresh client per render with retries off, so a failing/unexpected query fails
// fast and deterministically instead of being retried under fake timers.
const makeQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Wrap the app providers our routes rely on at runtime — React Query, router, and
// Intl — around `ui`. The <Route>/<Switch> being exercised stays in the test body
// (passed as `ui`), not hidden in here; this helper only supplies the shell.
const renderWithRs = (ui, { initialEntries = ['/'], messages = {} } = {}) => render(
  <QueryClientProvider client={makeQueryClient()}>
    <MemoryRouter initialEntries={initialEntries}>
      <IntlProvider
        locale="en"
        messages={messages}
        onError={ignoreMissingTranslations}
      >
        {ui}
      </IntlProvider>
    </MemoryRouter>
  </QueryClientProvider>
);

export { renderWithRs, ignoreMissingTranslations, makeQueryClient };
