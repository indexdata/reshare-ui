// Stand-in for the ky instance returned by `useOkapiKy()`. `useOkapiQuery` calls
// `useOkapiKy().extend(kyOpt)` then `okapiKy(path, { searchParams }).json()`
// (stripes-reshare/src/useOkapiQuery.js), so the mock is a callable whose
// `.extend()` returns itself and whose result has a `.json()` resolving the
// configured response.
//
// The callable is a jest.fn so tests can assert which paths were requested.
// Responses are set per-test via `.setResponses`; an unconfigured path throws so
// an accidental new request surfaces loudly rather than resolving to undefined.
const makeOkapiKyMock = () => {
  let responses = {};

  const okapiKy = jest.fn((path) => ({
    json: async () => {
      if (!(path in responses)) {
        throw new Error(`Unexpected Okapi request: ${path}`);
      }
      return responses[path];
    },
  }));

  okapiKy.extend = () => okapiKy;
  okapiKy.setResponses = (next) => { responses = next; };

  return okapiKy;
};

export { makeOkapiKyMock };
