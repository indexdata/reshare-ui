# ui-request

Copyright (C) 2018-2024 The Open Library Foundation

This software is distributed under the terms of the Apache License, Version 2.0.

This is an "alias" app, which merely invokes `ui-rs`. That app inspects the route by which it has been invoked to determine how it should function. That means it consists only of a single [three-line source-file](index.js) together with a [minimal package file](package.json), an [app icon](icons/app.svg) and [translation files](translations) containing [nothing but the name of the app](translations/ui-request/en_US.json).

## Release Procedures
* To prepare for a release, create a branch called release-N.N.x where N.N is the major and minor versions, and x is the letter x.
* Push a tag to the release branch when changes are finalized.
* From the Github repository page, create a release from the tag created in the previous step.
* CI will publish appropriate artifacts when the release is published.
