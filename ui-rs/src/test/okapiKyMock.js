// Stand-in for the ky instance returned by `useOkapiKy()`. `useOkapiQuery` calls
// `useOkapiKy().extend(kyOpt)` then `okapiKy(path, { searchParams }).json()`
// (stripes-reshare/src/useOkapiQuery.js), so the mock is a callable whose
// `.extend()` returns itself and whose result has a `.json()` resolving the
// configured response.
//
// The callable is a jest.fn so tests can assert which paths (incl. query strings)
// were requested via `okapiKy.mock.calls`. Responses are set per-test via
// `.setResponses` and keyed by pathname (the part before `?`), so a list query like
// `broker/patron_requests?limit=100&side=borrowing&cql=...` is matched by its
// `broker/patron_requests` key while the full URL stays recorded for assertions. An
// unconfigured pathname throws so an accidental new request surfaces loudly.
const makeOkapiKyMock = () => {
  let responses = {};

  const okapiKy = jest.fn((path) => ({
    json: async () => {
      const pathname = path.split('?')[0];
      if (!(pathname in responses)) {
        throw new Error(`Unexpected Okapi request: ${path}`);
      }
      return responses[pathname];
    },
  }));

  okapiKy.extend = () => okapiKy;
  okapiKy.setResponses = (next) => { responses = next; };

  // Mutations (e.g. the create-request flow) call `okapiKy.post(path, { json })`
  // directly rather than through `useOkapiQuery`, and read the created record back
  // via `res.json()`. Expose post/put as jest.fns so the call + payload are
  // assertable; each resolves a ky-style response whose `.json()` yields the body.
  // `setPostResponse`/`setPutResponse` let a test override the returned body.
  let postBody = { id: 'new-1' };
  let putBody = {};
  okapiKy.post = jest.fn(async () => ({ json: async () => postBody }));
  okapiKy.put = jest.fn(async () => ({ json: async () => putBody }));
  okapiKy.setPostResponse = (body) => { postBody = body; };
  okapiKy.setPutResponse = (body) => { putBody = body; };

  return okapiKy;
};

export { makeOkapiKyMock };
