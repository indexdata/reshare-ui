import { setLogger } from 'react-query';

// react-query v3 logs every rejected query and mutation, handled or not, so a test that
// provokes a failure on purpose is loud about the outcome it is asserting.
//
// Takes the message the calling file provokes on purpose; anything else still reaches
// the console, so an unexpected query failure stays visible. Jest's per-file module
// registry keeps the override out of other test files.
//
// TODO: fold into makeQueryClient on the v4 move — v4 keeps the logger but hangs it
// off the client (`new QueryClient({ logger })`), retiring the global override and
// this beforeAll/afterAll with it. v5 removes it outright.
const quietQueryLog = (expected) => {
  beforeAll(() => setLogger({
    log: console.log,
    warn: console.warn,
    error: (err) => {
      if (!expected.test(String(err?.message ?? err))) console.error(err);
    },
  }));

  afterAll(() => setLogger(console));
};

export { quietQueryLog };
