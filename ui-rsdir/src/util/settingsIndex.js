import fieldLabel from './fieldLabel';

const isSubField = field => (field.valueType || 'string').toLowerCase() === 'subfield' && Array.isArray(field.subMap);

// The children renderSubField shows: all of them, or for onlyOne the locked or saved subMap child.
// The editor drops unlocked subMap children before rendering; saved config still holds them.
const renderedChildren = (field, value) => field.subMap.filter(child => !field.onlyOne || (
  field.lockedSelection !== undefined ?
    child.fieldName === field.lockedSelection :
    value?.[child.fieldName] != null
));

// Ignore case and accents in both queries and labels.
export const normalizeText = (text, locale) => (
  text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase(locale)
);

// Preserve character lengths so highlight offsets still match the original text.
export const foldForHighlight = (text, locale) => text.replace(/[\s\S]/gu, character => {
  const folded = normalizeText(character, locale);
  return folded.length === character.length ? folded : character;
});

export const queryWords = (query, locale) => normalizeText(query, locale).split(/\s+/).filter(Boolean);

// Keep this traversal in sync with renderSubField:
// - Include visible settings even when they have no value.
// - Follow only the saved or profile-locked subMap child of onlyOne fields.
// - Include disabled fields' labels, but skip their descendants.
// Exclude objectMap children: they are table columns, not separate settings.
export const flattenSection = ({ configKey, fieldLabelId, fieldMap }, config, intl) => {
  const visit = (field, value, parent) => {
    const path = parent ? `${parent.path}.${field.fieldName}` : field.fieldName;
    const entry = {
      configKey,
      path,
      card: parent ? parent.card : field.fieldName,
      labels: [...(parent ? parent.labels : []), fieldLabel(intl, fieldLabelId, path)],
    };
    if (field.disabled || !isSubField(field)) return [entry];

    return [entry, ...renderedChildren(field, value).flatMap(child => visit(child, value?.[child.fieldName], entry))];
  };

  return fieldMap.flatMap(field => visit(field, config?.[field.fieldName]));
};

// Index labels using saved subMap selections and profile overrides.
// Sections come from useEffectiveSections, which applies the inheritance policy.
export const settingsIndex = (sections, entry, intl) => sections
  .filter(section => section.fieldMap && section.applies !== false)
  .flatMap(section => flattenSection(section, entry[section.configKey], intl))
  .map(field => ({ ...field, text: normalizeText(field.labels.join(' '), intl.locale) }));

export const matchSettings = (index, query, locale) => {
  const words = queryWords(query, locale);
  if (words.length === 0) return [];
  return index.filter(entry => words.every(word => entry.text.includes(word)));
};

// Count each card once, preserving field-map order.
export const matchedCards = matches => matches.reduce((cards, { configKey, card }) => {
  const sectionCards = cards[configKey] || [];
  return sectionCards.includes(card) ? cards : { ...cards, [configKey]: [...sectionCards, card] };
}, {});
