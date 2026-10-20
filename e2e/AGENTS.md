# reshare-ui e2e

Playwright specs for the ReShare UI and the captive stack they run against.
`README.md` covers the stack, the suite and its conventions; this file adds
what to keep in mind when working here.

## What this package is for

A UI change is checked by the jest tests and lint in the workspace that owns
the code, not by bringing the stack up. This package is for seeing a feature
in a running system, for workflow specs across two institutions and, with
`E2E_AXE=on`, for axe accessibility checks. It runs locally or on demand
through the `e2e` GitHub Actions workflow, never on every PR.

Playwright runs TypeScript without checking its types. After changing a spec or
anything in `lib/`, run `yarn typecheck`, which needs no stack, before running
the spec.

## Which checkout runs

The stack runs the specs and seed of the checkout `stack:up` is started from,
and builds the UI from that checkout's `platform-rs-dev` unless `PLATFORM_DIR`
points at another. When the specs and the UI changes under test are in
different checkouts, use `PLATFORM_DIR` to combine them.

## Looking at something

1. `yarn stack:health`; if it fails, `yarn stack:up`, with `PLATFORM_DIR` as
   above when the UI under study is in another checkout.
2. Put a request in the state of interest with `bin/brkr`, whose output
   includes the request's page URL.
3. Open that URL and log in with anything. When driving a browser through an
   MCP server, search the page for the text or control of interest rather than
   reading whole snapshots.
4. When iterating on UI code, use the README's dev servers rather than
   rebuilding the bundle.

## Writing specs

- The route sweep asserts only on what a route itself guarantees, and a
  workflow goes through the two UIs only and takes everything that varies by
  environment from `lib/env.ts`. That is what lets both run against an
  existing system. Whatever needs the seed, illmock scenarios or
  `lib/broker.js` belongs in a `*.captive.spec.ts`; `lib/broker.js` refuses to
  load outside the captive stack.
- A spec waits for the other side's moves and does not reload. If one ever
  must, not straight after a click: the reload aborts the request the click
  made. Likewise a click made while a list search is still navigating is
  undone when the navigation lands.
- Which action a state offers, and in what order a flow runs, is laid out
  best by the Bruno collections in the crosslink repo (`bruno/README.md`) and
  decided by `misc/state-models.yaml` there. `bin/brkr state` shows what a
  live request offers next.
- The state names a page shows come from the `states.*` translations in
  stripes-reshare, not from the broker's display names ("Shipped returned",
  not "Shipped Returned").
- To learn a page's controls, run a throwaway spec that drives to the state
  and prints the visible buttons and inputs, then delete it. Form fields are
  addressed by their final-form `name`; several states' primary action is the
  scan box (`[name="reqId"]`), and due dates are `[name="dueDate"]` in
  MM/DD/YYYY. Stripes lays a radio button's label over its input, so
  `check()` on the input retries until it times out; click the label
  (`locator('label', { hasText: /^Copy$/ })`).
- Wrap each stage of a workflow in `step()` from `lib/tenants.ts`, not
  `test.step`: it also captions the stage on both institutions' videos. Steps
  do not nest; an inner caption would be drawn over the outer one.
