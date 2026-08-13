// Form values <-> API bodies. The broker's Create and Update shapes differ:
// UpdateTemplate has no `purpose`, so a template's purpose is fixed at creation.

const cleanLabels = (labels) => (labels ?? [])
  .map(label => (label ?? '').trim())
  .filter(Boolean);

export function recordToFormValues(record = {}) {
  return {
    title: record.title ?? '',
    purpose: record.purpose ?? '',
    contentType: record.contentType ?? 'text',
    subject: record.subject ?? '',
    body: record.body ?? '',
    // Starting with a blank row is better UX than the repeatable field's empty state.
    labels: record.labels?.length ? [...record.labels] : [''],
    audience: record.audience ?? '',
  };
}

export function buildCreateTemplateBody(values = {}) {
  const created = {
    title: (values.title ?? '').trim(),
    purpose: values.purpose,
    body: values.body,
    contentType: values.contentType,
    labels: cleanLabels(values.labels),
  };
  const subject = (values.subject ?? '').trim();
  // Subject is documented as unused for pull slips; don't store a value that misleads.
  if (subject && values.purpose !== 'pullslip') created.subject = subject;
  if (values.audience) created.audience = values.audience;
  return created;
}

export function buildUpdateTemplateBody(values = {}) {
  const updated = {
    title: values.title,
    body: values.body,
    contentType: values.contentType,
    labels: cleanLabels(values.labels),
  };
  // Omitted optional fields are cleared by PUT.
  const subject = (values.subject ?? '').trim();
  if (subject) updated.subject = subject;
  if (values.audience) updated.audience = values.audience;
  return updated;
}

// Quill reads its value as markup, so text carried into HTML mode has to be escaped
// or fragments like "Dear <name>," disappear as unknown tags.
export function escapeHtml(text = '') {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function templateLabelOptions(templates, { purpose, audience } = {}) {
  const byLabel = new Map();
  (templates ?? [])
    .filter(t => t.purpose === purpose && (!t.audience || t.audience === audience))
    .forEach(t => (t.labels ?? []).forEach(label => {
      if (label && !byLabel.has(label)) byLabel.set(label, { value: label, label: `${t.title} (${label})` });
    }));
  return [...byLabel.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function suggestedLabels(templates) {
  const seen = new Set();
  (templates ?? [])
    .forEach(template => (template.labels ?? []).forEach(label => seen.add(label)));
  return [...seen];
}
