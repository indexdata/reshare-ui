import React from 'react';
// Provided by the shared Stripes test environment.
// eslint-disable-next-line import/no-extraneous-dependencies
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import useDirectoryOpenApi from './useDirectoryOpenApi';

const mockKy = jest.fn();
jest.mock('@folio/stripes/core', () => ({ useOkapiKy: () => mockKy }));

const Consumer = ({ enabled = true }) => {
  const query = useDirectoryOpenApi(enabled);
  return <div>{query.isError ? 'Unavailable' : query.data?.openapi || 'Loading'}</div>;
};

let queryClient;
const renderConsumers = children => render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);

beforeEach(() => {
  mockKy.mockReset();
  setLogger({ log: console.log, warn: console.warn, error: jest.fn() });
  queryClient = new QueryClient();
});

afterEach(() => {
  queryClient.clear();
  setLogger(console);
});

it('shares the authenticated fetch across consumers and navigation while fresh', async () => {
  mockKy.mockReturnValue({ json: () => Promise.resolve({ openapi: '3.0.0' }) });
  const { unmount } = renderConsumers(<><Consumer /><Consumer /></>);
  await waitFor(() => expect(screen.getAllByText('3.0.0')).toHaveLength(2));
  expect(mockKy).toHaveBeenCalledTimes(1);
  expect(mockKy).toHaveBeenCalledWith('directory/openapi.json', { signal: expect.anything() });
  unmount();
  renderConsumers(<Consumer />);
  expect(screen.getByText('3.0.0')).toBeInTheDocument();
  expect(mockKy).toHaveBeenCalledTimes(1);
});

it('keeps failures local without retries or an error boundary', async () => {
  mockKy.mockReturnValue({ json: () => Promise.reject(new Error('Unavailable')) });
  renderConsumers(<Consumer />);
  expect(await screen.findByText('Unavailable')).toBeInTheDocument();
  const query = queryClient.getQueryCache().find(['directory/openapi.json']);
  expect(query.options.retry).toBe(false);
  expect(query.options.useErrorBoundary).toBe(false);
  expect(mockKy).toHaveBeenCalledTimes(1);
});

it('does not fetch for an unsupported configuration', () => {
  renderConsumers(<Consumer enabled={false} />);
  expect(mockKy).not.toHaveBeenCalled();
});
