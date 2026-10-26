const CONFIG_SCHEMAS = {
  lmsConfig: 'LmsConfig',
  catalogConfig: 'CatalogConfig',
  holdingsPolicy: 'HoldingsPolicy',
  illConfig: 'IllConfig',
};

export const supportsConfigDescriptions = configKey => Object.prototype.hasOwnProperty.call(CONFIG_SCHEMAS, configKey);

const nonEmptyDescription = description => (
  typeof description === 'string' && description.trim() ? description : undefined
);

const localReference = (spec, reference) => {
  if (typeof reference !== 'string' || !reference.startsWith('#/')) return undefined;

  return reference.slice(2).split('/').reduce((value, part) => {
    const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
    return value && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined;
  }, spec);
};

// Traverse references at the current path before consuming the next property.
// Each branch has its own visited set so shared definitions remain reusable.
const metadataAtPath = (spec, schema, path, read, visited = new Set()) => {
  if (!schema || typeof schema !== 'object' || visited.has(schema)) return undefined;

  const nextVisited = new Set(visited).add(schema);
  if (path.length === 0) {
    const metadata = read(schema);
    if (metadata !== undefined) return metadata;
  }

  const candidates = [];
  if (path.length > 0) {
    if (schema.properties?.[path[0]]) {
      // Consuming a property starts a fresh cycle guard for its schema path.
      candidates.push(metadataAtPath(spec, schema.properties[path[0]], path.slice(1), read));
    }
    if (schema.items) {
      candidates.push(metadataAtPath(spec, schema.items, path, read, nextVisited));
    }
  }
  if (schema.$ref) {
    candidates.push(metadataAtPath(spec, localReference(spec, schema.$ref), path, read, nextVisited));
  }
  if (Array.isArray(schema.allOf)) {
    schema.allOf.forEach(child => {
      candidates.push(metadataAtPath(spec, child, path, read, nextVisited));
    });
  }

  const metadata = [...new Map(candidates.filter(value => value !== undefined)
    .map(value => [JSON.stringify(value), value])).values()];
  return metadata.length === 1 ? metadata[0] : undefined;
};

export const configFieldDescription = (spec, configKey, path) => {
  if (!supportsConfigDescriptions(configKey) || typeof path !== 'string' || !path) return undefined;

  return metadataAtPath(spec, spec?.components?.schemas?.[CONFIG_SCHEMAS[configKey]], path.split('.'),
    schema => nonEmptyDescription(schema.description));
};

// Undefined means absent metadata; null identifies a malformed extension.
export const configFieldDefaultData = (spec, configKey, path) => {
  if (!supportsConfigDescriptions(configKey) || typeof path !== 'string' || !path) return undefined;

  const data = metadataAtPath(spec, spec?.components?.schemas?.[CONFIG_SCHEMAS[configKey]],
    path.split('.'), schema => schema['x-default-data']);
  if (data === undefined) return undefined;
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
    Object.entries(data).some(([code, description]) => !code.trim() || typeof description !== 'string' || !description.trim())) {
    return null;
  }
  return Object.entries(data).map(([code, defaultDesc]) => ({ code, defaultDesc }));
};
