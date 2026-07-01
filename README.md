# reshare-ui
This is a monorepo containing the UI components for a ReShare system.

## Application components
This includes the following applications:
 * ui-rs: the main front end component of reshare
 * ui-request: the displayed request module. This is an alias application that invokes ui-rs
 * ui-supply: the displayed supply module. This is an alias application that invokes ui-rs

## platform-rs-dev
platform-rs-dev represents a minimal front end for ReShare built on the [stripes toolkit](https://github.com/folio-org/stripes). It includes components from the FOLIO's user management applications to support login.

## Environments
Environments contains platforms currently maintained in CI for development, testing, and demonstration purposes.

## CI information

### Tips
* Changes to markdown files do not trigger builds or deployments
* Include the string `[skip ci]` or `[ci skip]` in a commit message to bypass CI. 

###  Builds
TO DO

### Deployment
The ReShareX environment UI will rebuild when commits are made to the main branch of this repository. The deployment can also be triggered from the GitHub UI.

###  Release Procedure
TO DO
