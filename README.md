# reshare-ui

This is a monorepo containing the UI components for a [ReShare](https://projectreshare.org/) ILL system. They are based on [Stripes](https://github.com/folio-org/stripes), the UI framework for the FOLIO ecosystem.

It is a React single-page application that renders fully client-side and connects to the APIs exposed by the ReShare backend through Okapi, the API gateway used by FOLIO. It maintains a consistent UX with FOLIO by attempting to adhere to the same design system and use [`stripes-components`](https://dev.folio.org/stripes-components/) where possible.

The backend it talks to is provided by [CrossLink](https://github.com/indexdata/crosslink), chiefly the [broker](https://github.com/indexdata/crosslink/tree/main/broker), which routes ILL transactions between institutions, and the [directory service](https://github.com/indexdata/crosslink/tree/main/directory), which holds the member institutions themselves.

Stripes applications are currently bundled into static assets per-tenant via [`stripes-webpack`](https://dev.folio.org/stripes-webpack/) and [`stripes-cli`](https://dev.folio.org/stripes-cli).

## Contents

The repo has several top level directories, including the following applications:

- `ui-rs`: the main front end component of ReShare
- `ui-rsdir`: the interface for managing the directory of member institutions
- `ui-request` and `ui-supply`: alias applications to surface ui-rs as distinct request and supply apps within the top level Stripes toolbar

`stripes-reshare` contains components and utilities used by multiple apps.

Also here are some platforms. A Stripes "platform" consists simply of an NPM [`package.json`](https://docs.npmjs.com/files/package.json) that specifies the version of `@folio/stripes` and of any Stripes modules you wish to make available to generate client bundles. Building a bundle also takes tenant configuration: a config file naming the Okapi URL and tenant, saying which of those modules to enable, and pointing at any assets such as a logo. Anyone hosting ReShare/FOLIO will typically maintain a platform of their own, which is where they would add FOLIO applications, custom apps, or whatever else their bundles should carry.

- `platform-rs-dev` represents a minimal front end for ReShare built on the [stripes toolkit](https://github.com/folio-org/stripes). It includes components from FOLIO's user management applications to support login.
- `environments` contains platforms currently maintained in CI for development, testing, and demonstration purposes.

## Development

### Pre-requisites

Node and Yarn v1 (Classic), both of which Stripes is particular about. We intend to stay compatible with the current Node LTS release and the one before it. Packages in the `@folio` scope are not published to npmjs, so point that scope at FOLIO's own registry before installing:

```
yarn config set @folio:registry https://repository.folio.org/repository/npm-folio/
```

The repo is a [Yarn workspace](https://classic.yarnpkg.com/en/docs/workspaces), so a single `yarn install` at the root installs all of the modules here at once. It also links the apps and `stripes-reshare` into the dev platform in place of copies fetched from a registry, so an edit to one of them reaches a running server without a reinstall.

You will also need a ReShare backend to develop against. It does not have to be local, as a bundle served from your machine still runs in the browser and can reach an Okapi deployed anywhere.

### Running a development server

A development server is normally run from a platform rather than from an individual app, since ReShare work spans several modules and it is the platform that has them installed to bundle together:

```
cd platform-rs-dev
yarn stripes serve stripes.config.js
```

The argument names the tenant configuration to build against. The platform is built in memory and served at http://localhost:3000, rebuilding as files change.

The Okapi you point at has to allow requests from your development origin. If it does not, the browser blocks them with a CORS error, and the `--start-proxy` option of `stripes-cli` will run a local proxy in front of Okapi and point the bundle at that instead.

Besides the Okapi URL, the tenant and the module list, a stripes config carries a `config` block of settings that module code can read. ReShare's own settings live under `config.reshare` and cover things like the shared index to search and which optional fields to show.

Anything matching `*.local.js` is gitignored, so the convention for pointing a server somewhere else is to copy the config and serve that instead:

```
cp stripes.config.js cfg.local.js
yarn stripes serve cfg.local.js
```

The [`--okapi` and `--tenant` options](https://github.com/folio-org/stripes-cli/blob/master/doc/commands.md#serve-command) override those two values from the command line without a separate config at all.

The [Stripes Module Developer's Guide](https://github.com/folio-org/stripes/blob/master/doc/dev-guide.md) is the fullest account of how a module fits together, but it has aged in places. It still teaches `stripes-connect` for talking to the backend, which is deprecated. ReShare, like most current FOLIO development, uses [react-query](https://tanstack.com/query/v3/docs/framework/react/overview) instead, here via the `useOkapiQuery` helper from `stripes-reshare`.

## Code quality

Tests are Jest via [`jest-config-stripes`](https://github.com/folio-org/jest-config-stripes) and linting is ESLint via [`eslint-config-stripes`](https://github.com/folio-org/eslint-config-stripes), both configured per workspace and run from the workspace that owns the code:

```
cd ui-rs
yarn test
yarn lint
```

They can equally be run from the root by workspace name, e.g. `yarn workspace @projectreshare/rs test`.

## Deployment

`yarn build` from a platform writes a set of static assets to that platform's `output` directory: hashed JS bundles, CSS, fonts, translations and an `index.html`.

```
cd platform-rs-dev
yarn build
```

There is nothing server-side to run. The contents of `output` are copied to any static host or CDN, which is what CI does in publishing to S3.

The Okapi URL and tenant are fixed at build time, so a bundle belongs to one tenant. The same `--okapi` and `--tenant` options apply here, which is how CI builds the `rs1`, `rs2` and `rs3` bundles from a single tenant configuration.

Routing happens entirely in the browser, so the host must serve `index.html` for any path that does not match a file, instead of returning a 404. Without that, a page reload or an incoming link to anywhere but the root will fail.

Okapi also needs a module descriptor for each UI module enabled for a tenant. `yarn build-module-descriptors` generates these from the platform's config.

## CI information

The ReShareX environment UI will rebuild when commits are made to the main branch of this repository. The deployment can also be triggered from the GitHub UI.

### Tips

- Changes to markdown files do not trigger builds or deployments.
- Include the string `[skip ci]` or `[ci skip]` in a commit message to bypass CI.
