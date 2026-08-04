// Stand-in for the ky instance returned by `useOkapiKy()`: a callable whose `.extend()`
// returns itself and whose result has a `.json()` resolving the configured response.
// Callers reach it either as raw ky, with the query string in the path, or through
// `useOkapiQuery`, as `okapiKy(path, { searchParams })`; both are reduced to one effective
// URL, readable via `okapiKy.calledUrls()`.
//
// Responses are set per-test via `.setResponses`, keyed by pathname, so
// `broker/patron_requests?limit=100&cql=...` is matched by its `broker/patron_requests`
// key. An unconfigured pathname throws so an accidental new request surfaces loudly.
const effectiveUrl = (path, opts) => {
  const sp = opts?.searchParams;
  if (!sp) return path;
  const qs = sp instanceof URLSearchParams ? sp.toString() : new URLSearchParams(sp).toString();
  if (!qs) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${qs}`;
};

const makeOkapiKyMock = () => {
  let responses = {};

  const okapiKy = jest.fn((path, opts) => ({
    json: async () => {
      const url = effectiveUrl(path, opts);
      const pathname = url.split('?')[0];
      if (!(pathname in responses)) {
        throw new Error(`Unexpected Okapi request: ${url}`);
      }
      const configured = responses[pathname];
      // A response may be a function of the full URL (incl. query string) so a test can
      // vary the body per query — e.g. a facet-only or typeahead-narrowed request that
      // shares the `broker/patron_requests` pathname with the main list query.
      return typeof configured === 'function' ? configured(url) : configured;
    },
  }));

  okapiKy.extend = () => okapiKy;
  okapiKy.setResponses = (next) => { responses = next; };
  // Effective URLs (searchParams folded in) for every recorded call, in order.
  okapiKy.calledUrls = () => okapiKy.mock.calls.map(([path, opts]) => effectiveUrl(path, opts));

  // Mutations (e.g. the create-request flow) call `okapiKy.post(path, { json })`
  // directly rather than through `useOkapiQuery`, and read the created record back
  // via `res.json()`. Expose post/put as jest.fns so the call + payload are
  // assertable; each resolves a ky-style response whose `.json()` yields a body.
  // A test needing a different body or a failure uses jest's own
  // mockResolvedValueOnce/mockRejectedValueOnce.
  okapiKy.post = jest.fn(async () => ({ json: async () => ({ id: 'new-1' }) }));
  okapiKy.put = jest.fn(async () => ({ json: async () => ({}) }));
  // DELETE responds 204 with no body, so nothing here resolves a json payload.
  okapiKy.delete = jest.fn(async () => ({}));

  return okapiKy;
};

export { makeOkapiKyMock };
