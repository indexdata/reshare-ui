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

## Common field properties

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `fieldName` | string | Yes | JSON property name. Nested names address a child of their containing `subField` or `objectArray` object. |
| `valueType` | string | No | Controls the editor and JSON conversion. It defaults to `string` and is case-insensitive. Use the documented spelling for consistency. |
| `required` | boolean | No | Prevents saving when the value is empty. For an `objectArray` child, it also prevents adding an object without that value. |
| `validChoices` | array | No | Renders a scalar field as a select containing these choices plus an empty choice. Values are converted to strings in the editor. |
| `defaultDesc` | string | No | Displays a question-mark tooltip beside the field label, using this value when no translated description is available. |

Use `valueType`, not `type`, when declaring a field type.

## Value types

### `string`

Renders a text field and stores its value as a JSON string.

```js
{
  fieldName: 'address',
  valueType: 'string',
  required: true,
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

Both render numeric inputs. `integer` accepts plain signed base-10 digits only and is serialized with `Number`; decimals, exponent notation, plus signs, surrounding whitespace, and values outside JavaScript's safe-integer range are rejected. `number` is serialized with `parseFloat`. An empty value is stored as `null`.

```js
{
  fieldName: 'supplyPreference',
  valueType: 'integer',
}
```

### `stringArray`

Represents a JSON array of strings. Existing strings are displayed as removable blocks. The editor provides a text field and Add button for appending values.

```js
{
  fieldName: 'lendersOfLastResort',
  valueType: 'stringArray',
}
```

Setting `required: true` requires the array to contain at least one string.

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

An `objectMap` may contain scalar fields, fields with `validChoices`, `stringArray`, and `stringMap`. It may not contain `subField` or another `objectArray`.

Setting `required: true` on the `objectArray` itself requires at least one object.

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
- A `subField` without `subMap`, an `objectArray` without `objectMap`, a forbidden structural `objectMap` child, or malformed `requiredKeys` causes `SettingsConfigEditor` to throw a descriptive mapping error.

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
        fieldName: 'tags',
        valueType: 'stringArray',
      },
    ],
  },
];
```
