# ReShare Directory UI

## Introduction

Front-end for the ReShare consortial directory

## Address plugin configuration

The address module uses `config.reshare.addressPlugin` from the Stripes
configuration to select the plugin used to edit and display addresses. Supported
values are `generic`, `north-america`, and `british-isles`. If the setting is
omitted or has an unrecognized value, the module uses the `generic` plugin.

For example, the relevant section of `stripes.config.js` for the North American
address plugin is:

```js
module.exports = {
  config: {
    reshare: {
      addressPlugin: 'north-america',
    },
  },
};
```
