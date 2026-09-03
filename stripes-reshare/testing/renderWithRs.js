import React from 'react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { render, waitFor } from '@folio/jest-config-stripes/testing-library/react';

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
const renderWithRs = (ui, {
  initialEntries = ['/'], messages = {}, history
} = {}) => {
  const RouterProvider = history ? Router : MemoryRouter;
  const routerProps = history ? { history } : { initialEntries };
  const queryClient = makeQueryClient();

  return {
    // For settleQueries. Not awaited in here: asserting on loading state needs the
    // un-settled render.
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider {...routerProps}>
          <IntlProvider
            locale="en"
            messages={messages}
            onError={ignoreMissingTranslations}
          >
            {ui}
          </IntlProvider>
        </RouterProvider>
      </QueryClientProvider>
    ),
  };
};

// Zero-in-flight is momentary: like a useIsFetching() spinner it blinks between chained
// queries, so anything starting only after another resolves needs its own wait.
const settleQueries = (queryClient) => waitFor(
  () => expect(queryClient.isFetching()).toBe(0)
);

export { renderWithRs, settleQueries, ignoreMissingTranslations, makeQueryClient };
