import { renderHook } from '@folio/jest-config-stripes/testing-library/react';
import { useOkapiKy as useStripesOkapiKy } from '@folio/stripes/core';
import useOkapiKy from './useOkapiKy';

jest.mock('@folio/stripes/core', () => ({ useOkapiKy: jest.fn() }), { virtual: true });

// Capture the options the hook passes to ky's .extend() so we can drive the
// installed afterResponse hook directly.
let extendedWith;
const baseKy = { extend: jest.fn((opts) => { extendedWith = opts; return baseKy; }) };

const makeResponse = ({ ok, status, contentType, json, text }) => ({
  ok,
  status,
  headers: { get: () => contentType },
  clone: () => ({ json, text }),
});

const getAfterResponseHook = () => {
  renderHook(() => useOkapiKy());
  return extendedWith.hooks.afterResponse[0];
};

beforeEach(() => {
  jest.clearAllMocks();
  extendedWith = undefined;
  useStripesOkapiKy.mockReturnValue(baseKy);
});

describe('useOkapiKy', () => {
  it('passes successful responses through untouched', async () => {
    const hook = getAfterResponseHook();

    await expect(hook({}, {}, makeResponse({ ok: true, status: 200 }))).resolves.toBeUndefined();
  });

  it('rejects JSON error responses with a normalized error', async () => {
    const hook = getAfterResponseHook();
    const response = makeResponse({
      ok: false,
      status: 400,
      contentType: 'application/json',
      json: jest.fn().mockResolvedValue({ error: 'Bad request' }),
      text: jest.fn(),
    });

    await expect(hook({}, {}, response)).rejects.toMatchObject({
      message: 'Bad request',
      status: 400,
      parsedBody: { error: 'Bad request' },
      response,
    });
  });

  it('passes non-2xx responses through when throwHttpErrors is false', async () => {
    const hook = getAfterResponseHook();
    const response = makeResponse({
      ok: false,
      status: 400,
      contentType: 'application/json',
      json: jest.fn().mockResolvedValue({ error: 'Bad request' }),
      text: jest.fn(),
    });

    await expect(hook({}, { throwHttpErrors: false }, response)).resolves.toBeUndefined();
  });

  it('falls back to a status message when the body yields nothing', async () => {
    const hook = getAfterResponseHook();
    const response = makeResponse({
      ok: false,
      status: 500,
      contentType: 'application/json',
      json: jest.fn().mockRejectedValue(new Error('no body')),
      text: jest.fn().mockResolvedValue(''),
    });

    await expect(hook({}, {}, response)).rejects.toMatchObject({
      message: 'Request failed with status code 500',
      status: 500,
    });
  });
});
