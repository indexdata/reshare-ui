import {
  recordToFormValues,
  buildCreateTemplateBody,
  buildUpdateTemplateBody,
  escapeHtml,
  suggestedLabels,
  templateLabelOptions,
} from './mapping';

describe('recordToFormValues', () => {
  it('maps a stored template onto form values', () => {
    expect(recordToFormValues({
      id: 't1',
      title: 'Received',
      purpose: 'email',
      contentType: 'html',
      subject: 'Ready',
      body: '<p>Ready</p>',
      labels: ['received-notification'],
      audience: 'patron',
    })).toEqual({
      title: 'Received',
      purpose: 'email',
      contentType: 'html',
      subject: 'Ready',
      body: '<p>Ready</p>',
      labels: ['received-notification'],
      audience: 'patron',
    });
  });

  it('represents an absent audience as an empty selection', () => {
    expect(recordToFormValues({ title: 'T', body: 'B' }).audience).toBe('');
  });

  it('starts labels with one blank row rather than an empty list', () => {
    expect(recordToFormValues({ title: 'T', body: 'B' }).labels).toEqual(['']);
  });
});

describe('buildCreateTemplateBody', () => {
  const values = {
    title: 'Received',
    purpose: 'email',
    contentType: 'text',
    subject: ' Ready ',
    body: 'Your item is ready',
    labels: ['received-notification', '  ', ''],
    audience: 'patron',
  };

  it('trims labels and drops blank rows', () => {
    expect(buildCreateTemplateBody(values).labels).toEqual(['received-notification']);
  });

  it('sends purpose, which cannot be changed later', () => {
    expect(buildCreateTemplateBody(values).purpose).toBe('email');
  });

  it('omits a blank subject and a blank audience rather than sending empties', () => {
    const body = buildCreateTemplateBody({ ...values, subject: '   ', audience: '' });
    expect(body).not.toHaveProperty('subject');
    expect(body).not.toHaveProperty('audience');
  });

  it('omits the subject for pull slips, which never use one', () => {
    expect(buildCreateTemplateBody({ ...values, purpose: 'pullslip' })).not.toHaveProperty('subject');
  });
});

describe('buildUpdateTemplateBody', () => {
  const values = {
    title: 'Received',
    purpose: 'email',
    contentType: 'text',
    subject: 'Ready',
    body: 'Your item is ready',
    labels: ['received-notification'],
    audience: 'patron',
  };

  it('never sends purpose: UpdateTemplate has no such field', () => {
    expect(buildUpdateTemplateBody(values)).not.toHaveProperty('purpose');
  });

  it('omits blank optional fields', () => {
    const body = buildUpdateTemplateBody({ ...values, subject: '   ', audience: '' });
    expect(body).not.toHaveProperty('subject');
    expect(body).not.toHaveProperty('audience');
  });
});

describe('escapeHtml', () => {
  it('escapes markup so plain text survives the move into the editor', () => {
    expect(escapeHtml('Dear <name>, R&D')).toBe('Dear &lt;name&gt;, R&amp;D');
  });

  it('escapes ampersands before angle brackets', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });
});

describe('templateLabelOptions', () => {
  const templates = [
    { title: 'Pull slips', purpose: 'email', audience: 'staff', labels: ['pullslip-email', 'nightly'] },
    { title: 'Both audiences', purpose: 'email', labels: ['shared'] },
    { title: 'Patron notice', purpose: 'email', audience: 'patron', labels: ['received-notification'] },
    { title: 'Slip layout', purpose: 'pullslip', audience: 'staff', labels: ['slip'] },
  ];
  const options = templateLabelOptions(templates, { purpose: 'email', audience: 'staff' });

  // One assertion covers the lot: which templates qualify (this purpose, this audience
  // or none), one option per label, named by title and label, ordered by what is shown.
  it('offers a labelled option for every label of every matching template', () => {
    expect(options).toEqual([
      { value: 'shared', label: 'Both audiences (shared)' },
      { value: 'nightly', label: 'Pull slips (nightly)' },
      { value: 'pullslip-email', label: 'Pull slips (pullslip-email)' },
    ]);
  });

  it('offers a label shared by two templates once, as the broker resolves only one', () => {
    const dupes = [
      { title: 'First', purpose: 'email', audience: 'staff', labels: ['shared'] },
      { title: 'Second', purpose: 'email', audience: 'staff', labels: ['shared'] },
    ];
    expect(templateLabelOptions(dupes, { purpose: 'email', audience: 'staff' }))
      .toEqual([{ value: 'shared', label: 'First (shared)' }]);
  });

  it('is empty when the templates could not be fetched', () => {
    expect(templateLabelOptions(undefined, { purpose: 'email', audience: 'staff' })).toEqual([]);
  });
});

describe('suggestedLabels', () => {
  const defaults = [
    { purpose: 'email', labels: ['received-notification'] },
    { purpose: 'email', labels: ['pullslip-email', 'received-notification'] },
    { purpose: 'pullslip', labels: ['slip'] },
  ];

  it('collects labels across purposes without duplicates', () => {
    expect(suggestedLabels(defaults)).toEqual(['received-notification', 'pullslip-email', 'slip']);
  });

  it('is empty when the defaults could not be fetched', () => {
    expect(suggestedLabels(undefined)).toEqual([]);
  });
});
