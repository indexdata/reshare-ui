import React from 'react';
import { act, renderHook } from '@folio/jest-config-stripes/testing-library/react';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import usePerformAction from './usePerformAction';

const mockPost = jest.fn();
const mockSendCallout = jest.fn();

// The real wrapper's error normalization is covered by useOkapiKy.test.js;
// here we just need ky.post.
jest.mock('./useOkapiKy', () => () => ({ post: mockPost }));

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

  it('rethrows transport errors after surfacing the normalized message in the callout', async () => {
    // okapiKy's afterResponse hook has already normalized this into a readable
    // error before usePerformAction sees it (parsing is covered in
    // readErrorBody.test.js / useOkapiKy.test.js).
    const error = Object.assign(new Error('Backend message'), { status: 500 });
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
    expect(mockSendCallout).toHaveBeenCalledWith('ship.error', 'error', { errMsg: 'Backend message' });
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
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
