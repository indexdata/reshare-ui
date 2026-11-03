/* eslint-disable no-console */
import { setLogger } from 'react-query';

// react-query v3 logs every rejected query and mutation, handled or not, so a test that
// provokes a failure on purpose is loud about the outcome it is asserting.
//
// Takes the message the calling file provokes on purpose; anything else still reaches
// the console, so an unexpected query failure stays visible. Jest's per-file module
// registry keeps the override out of other test files.
//
// TODO: delete on the move to TanStack Query v5, which reports a failure only through
// the query's state and callbacks and never logs it, so there is nothing to quiet.
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
