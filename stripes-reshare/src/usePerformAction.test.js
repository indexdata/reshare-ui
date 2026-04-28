import React from 'react';
import { act, renderHook } from '@folio/jest-config-stripes/testing-library/react';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import usePerformAction from './usePerformAction';

const mockPost = jest.fn();
const mockSendCallout = jest.fn();

jest.mock('@folio/stripes/core', () => ({
  useOkapiKy: jest.fn(() => ({
    post: mockPost,
  })),
}), { virtual: true });

jest.mock('./useIntlCallout', () => jest.fn(() => mockSendCallout));

let queryClient;
let invalidateQueriesSpy;

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

const renderUsePerformAction = (requestId) => {
  queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

  return renderHook(() => usePerformAction(requestId), { wrapper });
};

describe('usePerformAction', () => {
  beforeAll(() => {
    setLogger({
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = undefined;
    invalidateQueriesSpy = undefined;
  });

  it('posts the action, resolves the broker success result, shows success, and invalidates request queries', async () => {
    const result = { outcome: 'success', result: 'OK', toState: 'SHIPPED' };
    const payload = { note: 'Packed' };
    mockPost.mockResolvedValue({
      json: jest.fn().mockResolvedValue(result),
    });

    const { result: hookResult } = renderUsePerformAction('request-123');

    let actual;
    // react-query updates mutation state during mutateAsync; act waits for those updates so assertions do not race React.
    await act(async () => {
      actual = await hookResult.current('ship', payload, { success: 'ship.success' });
    });

    expect(actual).toBe(result);
    expect(mockPost).toHaveBeenCalledWith(
      'broker/patron_requests/request-123/action',
      { json: { action: 'ship', actionParams: payload } }
    );
    expect(mockSendCallout).toHaveBeenCalledWith('ship.success', 'success');
    expect(invalidateQueriesSpy).toHaveBeenCalledWith('broker/patron_requests/request-123');
    expect(invalidateQueriesSpy).toHaveBeenCalledWith('broker/patron_requests/request-123/actions');
    expect(invalidateQueriesSpy).toHaveBeenCalledWith('broker/patron_requests');
  });

  it('rejects broker action failures after showing the action error callout', async () => {
    const result = { outcome: 'failure', message: 'PROBLEM', result: 'ERROR' };
    mockPost.mockResolvedValue({
      json: jest.fn().mockResolvedValue(result),
    });

    const { result: hookResult } = renderUsePerformAction('request-123');

    let thrown;
    await act(async () => {
      try {
        await hookResult.current('add-condition', {}, { error: 'add-condition.error' });
      } catch (err) {
        thrown = err;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.message).toBe('PROBLEM');
    expect(thrown.action).toBe('add-condition');
    expect(thrown.result).toBe(result);
    expect(mockSendCallout).toHaveBeenCalledWith('add-condition.error', 'error', { errMsg: 'PROBLEM' });
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('rethrows HTTP errors after showing the JSON response message', async () => {
    const error = new Error('Request failed');
    const responseJson = jest.fn().mockResolvedValue({ message: 'Backend message' });
    error.response = {
      clone: jest.fn(() => ({ json: responseJson })),
      json: jest.fn(),
      text: jest.fn(),
    };
    mockPost.mockRejectedValue(error);

    const { result: hookResult } = renderUsePerformAction('request-123');

    let thrown;
    await act(async () => {
      try {
        await hookResult.current('ship', {}, { error: 'ship.error' });
      } catch (err) {
        thrown = err;
      }
    });

    expect(thrown).toBe(error);
    expect(error.response.clone).toHaveBeenCalled();
    expect(responseJson).toHaveBeenCalled();
    expect(error.response.text).not.toHaveBeenCalled();
    expect(mockSendCallout).toHaveBeenCalledWith('ship.error', 'error', { errMsg: 'Backend message' });
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('falls back to text response bodies when an HTTP error is not JSON', async () => {
    const error = new Error('Request failed');
    error.response = {
      clone: jest.fn(() => ({ json: jest.fn().mockRejectedValue(new Error('Not JSON')) })),
      json: jest.fn(),
      text: jest.fn().mockResolvedValue('Plain text failure'),
    };
    mockPost.mockRejectedValue(error);

    const { result: hookResult } = renderUsePerformAction('request-123');

    let thrown;
    await act(async () => {
      try {
        await hookResult.current('ship', {}, { error: 'ship.error' });
      } catch (err) {
        thrown = err;
      }
    });

    expect(thrown).toBe(error);
    expect(error.response.text).toHaveBeenCalled();
    expect(mockSendCallout).toHaveBeenCalledWith('ship.error', 'error', { errMsg: 'Plain text failure' });
  });

  it('keeps rejection semantics but suppresses callouts when display is none', async () => {
    mockPost.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ outcome: 'failure', message: 'Hidden failure' }),
    });

    const { result: hookResult } = renderUsePerformAction('request-123');

    let thrown;
    await act(async () => {
      try {
        await hookResult.current('ship', {}, { display: 'none' });
      } catch (err) {
        thrown = err;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.message).toBe('Hidden failure');
    expect(mockSendCallout).not.toHaveBeenCalled();
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
