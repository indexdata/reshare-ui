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
const descriptionAtPath = (spec, schema, path, visited = new Set()) => {
  if (!schema || typeof schema !== 'object' || visited.has(schema)) return undefined;

  const nextVisited = new Set(visited).add(schema);
  if (path.length === 0) {
    const description = nonEmptyDescription(schema.description);
    if (description) return description;
  }

  const candidates = [];
  if (path.length > 0) {
    if (schema.properties?.[path[0]]) {
      // Consuming a property starts a fresh cycle guard for its schema path.
      candidates.push(descriptionAtPath(spec, schema.properties[path[0]], path.slice(1)));
    }
    if (schema.items) {
      candidates.push(descriptionAtPath(spec, schema.items, path, nextVisited));
    }
  }
  if (schema.$ref) {
    candidates.push(descriptionAtPath(spec, localReference(spec, schema.$ref), path, nextVisited));
  }
  if (Array.isArray(schema.allOf)) {
    schema.allOf.forEach(child => {
      candidates.push(descriptionAtPath(spec, child, path, nextVisited));
    });
  }

  const descriptions = [...new Set(candidates.filter(Boolean))];
  return descriptions.length === 1 ? descriptions[0] : undefined;
};

export const configFieldDescription = (spec, configKey, path) => {
  if (!supportsConfigDescriptions(configKey) || typeof path !== 'string' || !path) return undefined;

  return descriptionAtPath(spec, spec?.components?.schemas?.[CONFIG_SCHEMAS[configKey]], path.split('.'));
};
