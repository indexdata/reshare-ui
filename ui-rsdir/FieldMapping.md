# Settings configuration field mappings

Entry configuration routes use `SettingsConfigEditor` to edit an object stored on an Entry, such as `lmsConfig`, `catalogConfig`, or `holdingsPolicy`. Each route defines a local `fieldMap` array and passes it to the editor as `fieldMapping`:

```jsx
<SettingsConfigEditor
  configKey="catalogConfig"
  fieldLabelId={fieldName => `ui-rsdir.catalogConfig.${fieldName}`}
  fieldMapping={fieldMap}
  // Other route properties...
/>
```

Each top-level mapping is displayed in its own card and saved independently. Saving a card patches the corresponding property beneath `configKey`.

The optional editor callback `getSelectionChangeImpact({ fieldName, nextValue, resource })` can return `{ source: { setting, name }, groups: [{ configKey, paths }], catalogProfile? }` to require confirmation before a top-level dropdown draft changes. The optional `catalogProfile` names the explicit profile that prevents a proposed LMS vendor's catalog overrides from applying; it triggers confirmation even with no affected groups. Empty groups without `catalogProfile`, or an undefined result, apply the change immediately. Confirming updates the draft only; Save persists it. LMS vendor and catalog profile routes use `selectionChangeImpact` to list new override paths derived from OpenAPI `x-host-profiles`, respecting an independent catalog profile. Clearing either selection bypasses confirmation and updates the draft immediately; Save persists `null`, and a cleared catalog profile falls back to the LMS vendor. Removed overrides are not listed.

## Common field properties

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `fieldName` | string | Yes | JSON property name. Nested names address a child of their containing `subField` or `objectArray` object. |
| `valueType` | string | No | Controls the editor and JSON conversion. It defaults to `string` and is case-insensitive. Use the documented spelling for consistency. |
| `required` | boolean | No | Prevents saving when the value is empty. For an `objectArray` child, it also prevents adding an object without that value. |
| `disabled` | boolean | No | Renders a greyed-out field label with no editing controls. Supported on top-level mappings, `subMap` children, and `objectMap` children. Fields with `overrideValue` display that value read-only. Other disabled fields keep their content hidden. Disabled fields skip their own validation but retain their normal serialized value and still count when an enabled parent checks whether it is empty. |
| `defaultOnly` | boolean | No | For a code/description `objectArray`, restricts new additions to exact pairs published in OpenAPI `x-default-data`. Defaults to `false`. Saved entries remain visible and removable even if absent from current defaults. |
| `onlyOne` | boolean | No | For a `subField`, allows at most one direct `subMap` child to be selected. The editor renders a child selector and omits unselected children from the saved value. Disabled children remain visible but unavailable in the selector. Combine with `required` to require exactly one selection. |
| `lockedSelection` | string | No | Names the required direct child of an `onlyOne` field and disables its selector. Vendor/profile mappings derive this from overridden child or descendant paths. The editor displays that branch and retains its values, initializing it if absent; competing mapped branches are omitted on the next explicit save. Other fields within the branch remain editable unless disabled separately. |
| `overrideSource` | object | No | UI attribution `{ setting, name }`, where `setting` is `lmsConfig.vendor` or `catalogConfig.profile` and `name` is the selected vendor/profile. Vendor mappings attach it to overridden fields and locked `onlyOne` selectors. Renders a clickable badge with the active vendor/profile name (for example `[Alma]`) beside the label explaining the source; published override values appear read-only. This metadata is never saved to the configuration. |
| `overrideValue` | any | No | Raw profile override value for display on a disabled field. Its presence, including `null`, selects the read-only override display. It never enters drafts or PATCH payloads. |
| `minValue` | number | No | Inclusive minimum for an `integer` or `number` field. |
| `maxValue` | number | No | Inclusive maximum for an `integer` or `number` field. |
| `nullOnEmpty` | boolean | No | For a `string` field, serializes an exact empty string as `null`. |
| `validChoices` | array | No | Renders a scalar field as a select containing these choices plus an empty choice. Values are converted to strings in the editor. |
| `defaultDesc` | string | No | Displays a blue circle “i” tooltip before the field label, using this value when no translated description is available. Manual help takes precedence over OpenAPI help. |
| `getSaveErrorMessage` | function | No | Receives a failed PATCH error and may return a field-specific React node or string. Returning `undefined` uses the error's default message. |

Use `valueType`, not `type`, when declaring a field type.

For `lmsConfig`, `catalogConfig`, `holdingsPolicy`, and `illConfig`, the editor also fetches `directory/openapi.json` and resolves descriptions from the corresponding resource schemas (`LmsConfig`, `CatalogConfig`, `HoldingsPolicy`, and `IllConfig`). Nested properties, array items, local references, and `allOf` are supported. Descriptions on a property take precedence over referenced descriptions. API descriptions are displayed as plain text, including any literal placeholders. Fields without a manual or schema description have no help icon. The shared specification cache stays fresh for 30 minutes. Description loading or failure alone does not block editing; the LMS and catalog routes additionally require the host-profile metadata described below.

## Vendor and catalog profiles

LMS vendor and catalog profile choices and override paths come from the document-root `x-host-profiles` extension in `directory/openapi.json`, using the same authenticated query and cache as descriptions. `hostProfilesFromOpenApi(spec)` returns `{ names, vendorFieldMapping, vendorFieldValues }`; names are sorted alphabetically. Each profile contains `lmsConfig` and/or `catalogConfig` override objects. Missing sections and empty objects contribute no paths. Nested objects become dotted paths; arrays are overridden as a whole, and scalar values including `false`, `0`, empty strings, and `null` identify overridden fields. The parallel `vendorFieldValues` index retains each raw value by profile, config section, and dotted path. Override values are displayed read-only and are never copied into saved configuration. Lists and object arrays use the normal read-only layouts without collection controls; `false`, `0`, `null`, empty strings (`""`), and empty arrays (`[]`) remain distinguishable.

Both routes require valid metadata before mounting the editor. A missing, empty, or malformed extension, or a failed fetch without valid cached data, shows an error and Retry button. Each route validates the published profiles against its field mapping before mounting the editor, including exclusive-branch conflicts and object-array overrides. Object-array overrides must be `null` or arrays of objects; null/scalar/array items are rejected. Valid cached metadata remains usable during a background fetch failure. The existing loading pane is displayed while metadata first loads.

Both dropdowns list published profile names plus the entry's current saved selection if it is absent from the extension. An unpublished saved selection has no known overrides and can be retained, replaced, or cleared. Catalog overrides use the explicit `catalogConfig.profile`, falling back to `lmsConfig.vendor` when cleared or absent.

`vendorFieldMappingForVendor(fieldMapping, vendor, configKey, vendorFieldMapping, setting?, overrideValues?)` applies the parsed paths to UI fields; `setting` defaults to `lmsConfig.vendor`. Passing `vendorFieldValues` as `overrideValues` attaches an `overrideValue` to overridden fields. `applyDisabledPaths(fieldMapping, disabledPaths, overrideSource?, overrideValues?)` accepts the per-config dotted-path value index. Locked container selectors receive source attribution but no whole-container override value. `selectionChangeImpact({ configKey, nextValue, resource, vendorFieldMapping })` uses the same parsed metadata for confirmations. Neither helper contains a hardcoded profile table.

## Value types

### `string`

Renders a text field and stores its value as a JSON string. When `nullOnEmpty: true`, an exact empty string is stored as `null`; whitespace-only strings are unchanged. Required validation still rejects the empty value before serialization.

```js
{
  fieldName: 'address',
  valueType: 'string',
  nullOnEmpty: true,
}
```

A string with `validChoices` renders as a select:

```js
{
  fieldName: 'metadataUpdateMode',
  valueType: 'string',
  validChoices: ['replace', 'merge', 'none', 'auto'],
}
```

### `boolean`

Renders a True/False select. The selected value is stored as a JSON boolean. An empty selection is stored as `null`.

```js
{
  fieldName: 'lendable',
  valueType: 'boolean',
  required: true,
}
```

### `integer` and `number`

Both render numeric inputs. `integer` accepts plain signed base-10 digits only and is serialized with `Number`; decimals, exponent notation, plus signs, surrounding whitespace, and values outside JavaScript's safe-integer range are rejected. `number` is serialized with `parseFloat`. An empty value is stored as `null`. Optional `minValue` and `maxValue` bounds are inclusive and must be finite numbers; when both are present, `minValue` must not exceed `maxValue`.

```js
{
  fieldName: 'supplyPreference',
  valueType: 'integer',
  minValue: -1,
  maxValue: 10000,
}
```

### `stringArray`

Represents a JSON array of strings. Existing strings are displayed as removable blocks. The editor provides a text field and Add button for appending values.

```js
{
  fieldName: 'tags',
  valueType: 'stringArray',
}
```

Setting `required: true` requires the array to contain at least one string.

### `symbolList`

Represents a JSON array of symbol objects containing `authority` and `symbol` properties. Existing symbols are displayed as removable `authority:symbol` blocks. The editor provides Authority and Name fields plus an Add button for appending symbols; both values are required, trimmed, and compared exactly when preventing duplicates.

```js
{
  fieldName: 'lendersOfLastResort',
  valueType: 'symbolList',
}
```

The Name field is stored in the object's `symbol` property. A stored value has this shape:

```js
[
  { authority: 'ISIL', symbol: 'US-NYPL' },
  { authority: 'OCLC', symbol: 'ZYU' },
]
```

Setting `required: true` requires the array to contain at least one symbol. A `symbolList` may also be nested within a `subField`:

```js
{
  fieldName: 'routing',
  valueType: 'subField',
  subMap: [
    {
      fieldName: 'preferredLenders',
      valueType: 'symbolList',
    },
  ],
}
```

It may also be a field within each object in an `objectArray`:

```js
{
  fieldName: 'groups',
  valueType: 'objectArray',
  objectMap: [
    {
      fieldName: 'symbols',
      valueType: 'symbolList',
      required: true,
    },
  ],
}
```

### `stringMap`

Represents a JSON object whose property values are strings. Entries are displayed as removable `key: value` blocks. The editor provides key and value fields for adding entries, rejects duplicate keys, and does not add blank keys or values.

```js
{
  fieldName: 'options',
  valueType: 'stringMap',
  requiredKeys: ['address'],
}
```

`requiredKeys` is optional and must be an array of strings. Each named key must be an own property of the map before it can be saved. Matching is exact and case-sensitive. Validation concerns key presence, so a key loaded with an empty-string value still counts as present. Duplicate declarations in `requiredKeys` produce only one missing-key error.

Setting `required: true` requires the map to contain at least one entry, independently of `requiredKeys`.

### `subField`

Represents a nested JSON object. It requires a `subMap` containing the mappings for the object's properties. `subField` mappings may be nested to arbitrary depth.

```js
{
  fieldName: 'holdingsFormat',
  valueType: 'subField',
  subMap: [
    {
      fieldName: 'marc',
      valueType: 'subField',
      subMap: [
        {
          fieldName: 'mainField',
          valueType: 'string',
        },
      ],
    },
  ],
}
```

The example maps `holdingsFormat.marc.mainField`. A required `subField` is empty only when all of its mapped descendants are empty.

### `objectArray`

Represents a JSON array of objects. It requires an `objectMap` defining the fields within each object.

```js
{
  fieldName: 'locations',
  valueType: 'objectArray',
  objectMap: [
    {
      fieldName: 'code',
      valueType: 'string',
      required: true,
    },
    {
      fieldName: 'name',
      valueType: 'string',
      required: true,
    },
    {
      fieldName: 'supplyPreference',
      valueType: 'integer',
      required: true,
    },
  ],
}
```

Each object is displayed as a removable block containing its mapped fields. New objects are assembled in a separate form and must contain at least one mapped value. All required object fields must be supplied before the object can be added. Existing objects are removed and re-added rather than edited in place.

An `objectMap` may contain scalar fields, fields with `validChoices`, `stringArray`, `symbolList`, and `stringMap`. It may not contain `subField` or another `objectArray`.

Setting `required: true` on the `objectArray` itself requires at least one object.

#### Predefined code/description entries

An `objectArray` with string children `code` and `defaultDesc` automatically reads
`x-default-data` from the corresponding OpenAPI property. The extension is an object
mapping codes to descriptions, for example:

```yaml
x-default-data:
  LibraryUseOnly: "Use in library only"
```

The editor offers a searchable **Add predefined** picker and **Add selected** button.
Options show `code: description`; configured codes are excluded using exact,
case-sensitive comparison. Removing an entry makes its predefined option available
again. Entries append in selection order to the draft; Save persists them. Nothing
is populated automatically. **Add custom** reveals the normal object-entry form,
which rejects duplicate codes. Object arrays without the extension retain their
normal form.

Set `defaultOnly: true` on the object-array mapping to omit custom-entry controls
and allow only predefined pairs for new additions. This requires string `code` and
`defaultDesc` mappings. It does not remove or rewrite saved entries that differ
from the defaults. Unchanged saved code/description pairs may retain empty strings
accepted by the API; new entries still require both values. Once a user starts
typing a custom entry, its form stays open if metadata finishes loading.
Missing or malformed metadata offers Retry; it never enables
free-text entry for a `defaultOnly` array. Other configuration fields remain usable.

#### Optional translations of entry descriptions

Description translations are optional and affect display only. For a code such as
`LibraryUseOnly` in `loanConditions`, add this key to
`translations/ui-rsdir/en.json` (or the appropriate locale file):

```json
"illConfig.loanConditions.values.LibraryUseOnly": "For use inside the library only"
```

The runtime ID is `${fieldLabelId(path)}.values.${code}`. Codes are used literally,
including their punctuation, and never translated. A non-empty translation replaces
the description in the predefined picker, selected chips, saved-entry blocks, and
read-only overrides, including entries with customized descriptions. Without a
translation, the object's own `defaultDesc` is displayed as plain text. Search
matches codes and the displayed description. Custom codes may use the same
translation convention, independently for each field.

Translations do not change custom-entry inputs, drafts, API defaults, or PATCH
payloads. Selecting a predefined option saves its original API description.

## Paths, labels, and IDs

The editor builds a dotted path for nested labels. A route's `fieldLabelId` callback receives paths such as:

```text
holdingsFormat
holdingsFormat.marc
holdingsFormat.marc.mainField
locations.code
```

For a `catalogConfig` route whose callback prefixes `ui-rsdir.catalogConfig.`, the final translation ID for `holdingsFormat.marc.mainField` is:

```text
ui-rsdir.catalogConfig.holdingsFormat.marc.mainField
```

When a mapping has a non-empty `defaultDesc`, its description translation ID is the field label ID with `.desc` appended. For example:

```js
{
  fieldName: 'edition',
  valueType: 'string',
  defaultDesc: 'The edition statement used to search the catalog.',
}
```

The description above can be overridden by the translation entry:

```text
ui-rsdir.catalogConfig.metadataFormat.marc21.edition.desc
```

Descriptions are supported for top-level fields, nested `subMap` fields, and `objectMap` fields. A missing or empty `defaultDesc` does not render a tooltip.

Control IDs use the same path with dots replaced by hyphens. Field names should therefore be unique among siblings and should not contain dots.

## Validation and serialization

- Required scalar values reject an empty string, `null`, or `undefined`.
- Required arrays reject an empty array; required maps reject an object with no keys.
- Nested validation errors use the field's full dotted path.
- `subField` and `objectArray` mappings recursively convert boolean, integer, and number children to their JSON types.
- Object properties not present in `subMap` or `objectMap` are preserved when a mapped value is edited and saved.
- A `subField` without `subMap`, an `objectArray` without `objectMap`, a forbidden structural `objectMap` child, malformed `requiredKeys`, invalid numeric bounds, or `nullOnEmpty` on a non-string field causes `SettingsConfigEditor` to throw a descriptive mapping error.

## Complete example

```js
const fieldMap = [
  {
    fieldName: 'connection',
    valueType: 'subField',
    subMap: [
      {
        fieldName: 'address',
        valueType: 'string',
        required: true,
      },
      {
        fieldName: 'options',
        valueType: 'stringMap',
        requiredKeys: ['database'],
      },
    ],
  },
  {
    fieldName: 'mode',
    valueType: 'string',
    validChoices: ['replace', 'merge'],
  },
  {
    fieldName: 'locations',
    valueType: 'objectArray',
    objectMap: [
      {
        fieldName: 'code',
        valueType: 'string',
        required: true,
      },
      {
        fieldName: 'priority',
        valueType: 'integer',
      },
      {
        fieldName: 'symbols',
        valueType: 'symbolList',
      },
    ],
  },
];
```
