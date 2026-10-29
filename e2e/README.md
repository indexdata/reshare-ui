# ReShare browser E2E

Playwright tests and a local **captive stack**: the real ReShare UI, CrossLink
broker and directory, with mock authentication and an illmock LMS/protocol peer.
The stack also works as a standalone environment for inspecting UI behavior.
Tests never start or stop it, so failures leave their state available to inspect.

Run the commands below from `e2e/`. This package is outside the Yarn workspace
and has its own lockfile.

## Quick start

Requires Docker Compose, Node, Yarn, curl and jq. Install the parent workspace's
dependencies first; the UI build uses its Stripes CLI and modules.

```sh
yarn install --frozen-lockfile
npx playwright install --with-deps chromium  # Playwright's Chromium and ffmpeg
yarn stack:up                              # build both UIs and start the stack
yarn test
yarn stack:down                            # discard containers and DB state
```

The suite runs the browser at `PLAYWRIGHT_CHROMIUM_EXECUTABLE` when that is
set, otherwise `/usr/bin/chromium` when it exists, and only then Playwright's
own Chromium. A system Chromium is whatever version the distribution ships,
not the build this Playwright release was made against, which is the one CI
uses, so a failure seen only locally may come from that difference. Video
recording needs Playwright's own ffmpeg whichever browser runs, since
Playwright cannot use a system one. The install above brings it; with a system
Chromium, `npx playwright install ffmpeg` is enough on its own.

Open <http://localhost:3000/request/requests> for `test1` or
<http://localhost:3002/request/requests> for `test2`. Log in with any credentials.

## Running tests

```sh
yarn test                                 # smoke and workflows
yarn test --project=smoke
yarn test tests/workflows/copy.spec.ts
E2E_AXE=on yarn test                       # accessibility checkpoints
E2E_VIDEO=on yarn test                     # keep video for passing tests too
E2E_TRACE=on yarn test                     # likewise the trace
E2E_SLOWMO=300 E2E_VIDEO=on yarn test      # a watchable video; see below
yarn test:headed                          # requires a display
yarn test:ui
yarn typecheck                            # type errors in specs and lib; no stack needed
npx playwright show-report
npx playwright show-trace test-results/<test>/trace.zip
```

Traces and videos are retained on failure. Workflows attach one video per
institution. Tests run with one worker; CI retries a failure once.

A video names each action and highlights the element it acts on, and captions
the step in progress. It still plays at the speed the test ran, which is too
fast to follow by eye. The trace is the artefact for following a run: one
timeline for both institutions, with a screenshot, DOM snapshot and network
for every action, grouped by step. `E2E_SLOWMO=<ms>` is for when a video is
the point, such as a demo: it waits that long before every browser action,
so the run is slower and its timing differs from a normal run. It is never on
by default, locally or in the workflow.

The `e2e` GitHub Actions workflow runs on demand from the Actions tab, rather
than on every PR. Choose a project, optionally a filename filter (`renewal
copy`), and whether to run axe. Video and trace are always on, and the
slow-motion input passes through as `E2E_SLOWMO`. The run publishes its HTML
report to the repo's GitHub Pages site, which holds the latest run only; the
run page links it. Each run also keeps its report as an artifact: download and
unzip it, then `npx playwright show-report <directory>`.

### Suite conventions

- `tests/smoke/`: read-only specs, which change nothing on the system they run
  against. Route checks use landmarks from `lib/routes.ts` and reject error
  boundaries, uncaught exceptions and console errors; captive smoke specs
  assert on the seed. A spec that creates or acts on anything does not belong
  here, whatever its size.
- `tests/workflows/`: specs that create requests and act on them, and leave
  them behind on every run, so they belong on test systems only. Most drive two
  institutions: `lib/tenants.ts` supplies separate browser sessions;
  `lib/request.ts` holds shared interactions. Use unique titles and title
  search to find requests in a populated stack.
- `*.captive.spec.ts`: tests that depend on the seed, illmock scenarios or
  `lib/broker.js`. External runs exclude these files.
- Wait for visible state, not fixed delays. Workflows rely on the broker's live
  updates; reloading would hide a broken event stream.
- Keep environment-specific values in `lib/env.ts`. Prefer one spec per workflow
  branch rather than per feature.

### Accessibility

`E2E_AXE=on` runs axe's default rules at route landmarks, workflow state waits
and tab switches. Add `checkA11y` calls for additional views such as modals or
filled forms. Findings are soft assertion failures: the workflow continues,
then fails with JSON details attached to the report.

Keep findings failing until fixed or explicitly waived in `lib/axe.ts`; scope
waivers to selectors and comment the owning code and reason.

## Stack and lifecycle

| Service | Host endpoint | Purpose |
|---|---|---|
| nginx | `:3000` / `:3002` | built UI for `test1` / `test2` |
| nginx | `:9130` / `:9131` | mock Okapi for each tenant |
| broker | `:8080` | request state and ISO 18626 |
| directory | `:8086` | institutions, branches and configuration |
| illmock | `:8081` | external ISO 18626 peer and mock NCIP |
| postgres | container only | broker and directory databases |

`docker-compose.yml` defines the stack; `mock-okapi/` contains nginx's stubs and
proxies. The stack uses a fixed Compose project name and ports, so worktrees
share one instance. Published CrossLink images use floating `:main` tags and
are pulled on every startup. Runs therefore require network access and are not
reproducible against a fixed backend revision.

| Command | Effect |
|---|---|
| `yarn stack:up` | rebuild both bundles, start services, import seed, check health |
| `yarn stack:up --no-build` | reuse both existing bundles and start services |
| `yarn bundle:build` | rebuild bundles without changing containers |
| `yarn stack:health` | probe both UIs, both broker proxies and the directory |
| `yarn stack:down` | stop containers and delete DB volumes |

`yarn test` performs its own bounded readiness checks in `global-setup.ts`.
Neither passing nor failing tests tear down the stack. Data survives broker
restarts but is discarded by `stack:down`.

Builds use this checkout's `platform-rs-dev`. To test another checkout, set
`PLATFORM_DIR` to its absolute platform path. Relative paths resolve from `e2e/`.
For hot reload, run these from that platform directory instead:

```sh
yarn start --okapi http://localhost:9130 --tenant test1 --port 3001
yarn start --okapi http://localhost:9131 --tenant test2 --port 3003
```

The dev servers share the stack's data and require their own browser login.
The suite still uses the static bundles unless its base URLs are overridden.

To build backend images from a local CrossLink checkout:

```sh
CROSSLINK_DIR=/path/to/crosslink ./stack-up.sh --build-broker
```

### Authentication and seed

Nothing in the stack checks credentials. nginx plays the whole stripes-core
login handshake: `/authn/login` returns 201 with a token for any credentials,
`/bl-users/_self` a user with `["*"]` permissions, `/saml/check` that SSO is off.
The broker and directory trust the `X-Okapi-Tenant` and token headers nginx
injects, which is their normal Okapi-mode posture. The directory also gets
`X-Okapi-Permissions` listing every directory role, consortium admin included,
which is what Okapi would pass on for a user holding every permission. This
setup does not test authentication or production permission enforcement.
Unrecognized mock paths return JSON 404s so missing stubs fail route checks;
add stubs to `mock-okapi/okapi-stubs.inc`, which both tenants' mock-okapi
servers include.

Token expirations are computed 24 days ahead to stay within Stripes' browser
timer limit; see `mock-okapi/token-expiry.js`.

`stack:up` imports `seed/directory.json`, replacing matching entries. The broker
caches directory entries; restart it to see seed changes at once. The seed
contains:

- `test1` and `test2`: institutions inside the same broker, each with pickup
  branches, a UI bundle and a mock-Okapi endpoint. They move only when driven.
  Each branch carries its tenant, as the institution does, and has a Shipping
  address.
- `mock` (`ISIL:US-MOCK`): an external supplier served by illmock. Requests to it
  exercise ISO 18626 HTTP traffic.

The mock holdings lookup reads `return-<supplier symbol>::<item id>` from the
system instance identifier. For example, `return-ISIL:US-TEST2::anything` selects
`test2`; without a matching identifier a request becomes Unfilled. `p12345` is a
valid mock patron.

`stack:up` then imports the patron requests generated by `seed/requests.ts`
through the broker's `/import`, replacing earlier copies of them. They belong to
`test1`, most on its borrowing side, and every title contains the word
`e2eseed`, so a title search for it finds them and nothing else.
`tests/smoke/request-list.captive.spec.ts` takes its expected counts from the
same module. Nothing should act on these requests, since that would change what
the list spec counts and would test the import rather than a workflow.

illmock scenarios go in the request note or supplier record ID, for example
`MOCK:US-MOCK:LOANED` or `MOCK:US-MOCK:UNFILLED`. See CrossLink's illmock README
for supported scenarios. Both seeded tenants disable `acceptItemEnabled`.

### Arranging state with `bin/brkr`

`lib/broker.js` exposes captive API primitives; `bin/brkr` wraps them for manual
inspection. It has no workflow logic. Use `state` to see available actions and
`wait` for asynchronous peer changes. Each command prints a JSON handle; `state`,
`act` and `wait` also include the current state and available actions.

```sh
bin/brkr create lending --title "Renewal"   # returns id and peer.id
bin/brkr act <id> lending ship --dueDate 2026-09-20T00:00:00Z
bin/brkr wait <peer-id> borrowing SHIPPED --tenant test2
bin/brkr act <peer-id> borrowing receive --tenant test2
bin/brkr state <id> lending
```

`create borrowing --scenario LOANED_OVERDUE` uses illmock as the supplier.
The default requester for `create lending` is `test2`; drive it with
`--tenant test2` or through its UI. The CLI header lists all arguments.

`bin/brkr` and `lib/broker.js` treat an action as failed unless the broker
reports its outcome as `success`, whatever the HTTP status.

## Existing environments (experimental)

Setting `E2E_USERNAME` selects external mode: captive specs and local API probes
are skipped. Without `E2E_PEER_BASE_URL`, only the smoke specs run, so the run
is read-only.

```sh
E2E_BASE_URL=https://rs1.example.org \
E2E_USERNAME=someuser E2E_PASSWORD=... \
yarn test
```

Naming a peer enables workflows, which **create requests and perform real LMS
operations**. Configure its credentials and an available supplier item, a valid
borrower patron and pickup location. External workflows have not yet been
validated: they require live updates, the `return-<symbol>::<id>` catalog
convention, and a lender that accepts due-date overrides into the past.
Every workflow run leaves its requests behind at both institutions, and a
failed run can also leave a loan open. Defaults are not validated for external
targets; set all relevant values explicitly.

Use `npx playwright test --list` to inspect selection without running tests.

| Variable | Captive default | Meaning |
|---|---|---|
| `E2E_BASE_URL` / `E2E_PEER_BASE_URL` | `http://localhost:3000` / `http://localhost:3002` | borrower / lender UI |
| `E2E_USERNAME` / `E2E_PASSWORD` | `e2e` / `e2e` | borrower login; setting username selects external mode |
| `E2E_PEER_USERNAME` / `E2E_PEER_PASSWORD` | `e2e` / `e2e` | lender login |
| `E2E_SYMBOL` / `E2E_PEER_SYMBOL` | `ISIL:US-TEST1` / `ISIL:US-TEST2` | institution symbols |
| `E2E_ITEM_ID` / `E2E_ITEM_BARCODE` | `e2e-item` / `e2e-barcode` | supplier item data |
| `E2E_ITEM_TITLE` / `E2E_ITEM_AUTHOR` | `E2E workflow title` / `E2E Author` | request citation |
| `E2E_PATRON_ID` | `p12345` | borrower patron |
| `E2E_PICKUP_LOCATION` / `E2E_PICKUP_STREET` | `Test1 Main Library` / `1 Main Street` | pickup branch and shipping street |

Captive tooling also accepts `E2E_OKAPI_URL` (default `http://localhost:9130`),
`E2E_BROKER_URL` (`http://localhost:8080`), `E2E_ILLMOCK_URL`
(`http://localhost:8081`), `E2E_TENANT` / `E2E_PEER_TENANT` (`test1` / `test2`),
and `E2E_ILLMOCK_SYMBOL` (`ISIL:US-MOCK`). These do not reconfigure Compose's
ports or compiled bundle settings. Compose publishes the stack's ports on
`E2E_BIND` (default `127.0.0.1`); set `E2E_BIND=0.0.0.0` to reach the stack
from other machines. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` chooses
the browser (see Quick start).

## Troubleshooting

- **Readiness failure:** run `yarn stack:health`, `docker compose ps` and
  `docker compose logs broker directory nginx`.
- **Stale UI:** run `yarn bundle:build`, then reload. `--no-build` reuses the
  previous build, including any previous `PLATFORM_DIR` choice.
- **Unhandled-path 404:** add the missing endpoint to
  `mock-okapi/okapi-stubs.inc`, then `docker compose restart nginx`.
