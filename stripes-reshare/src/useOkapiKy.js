import { useOkapiKy as useStripesOkapiKy } from '@folio/stripes/core';
import readErrorBody from './readErrorBody';

const normalizeHttpErrors = async (request, options, response) => {
  if (response.ok || options.throwHttpErrors === false) return undefined;

  const { message, parsedBody } = await readErrorBody(response);
  const error = new Error(message || `Request failed with status code ${response.status}`);
  error.name = 'OkapiError';
  error.response = response;
  error.status = response.status;
  if (parsedBody !== undefined) error.parsedBody = parsedBody;
  throw error;
};

/**
 * Returns an Okapi Ky client with consistent errors for unsuccessful HTTP
 * responses. Use it in place of `useOkapiKy` from `@folio/stripes/core`.
 *
 * For an HTTP error, the thrown error includes:
 *
 * - `message`: a displayable response message when available;
 * - `status`: the HTTP status code;
 * - `parsedBody`: the parsed JSON response body, when the response is JSON;
 * - `response`: the response, for endpoint-specific handling.
 *
 * Network and timeout errors retain their original message. Requests with
 * `throwHttpErrors: false` continue to return their response normally.
 */
const useOkapiKy = (...args) => useStripesOkapiKy(...args).extend({
  hooks: { afterResponse: [normalizeHttpErrors] },
});

export default useOkapiKy;
