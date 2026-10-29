import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@folio/jest-config-stripes/testing-library/react';
import { Paneset } from '@folio/stripes/components';

import { renderWithRs, settleQueries } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import { quietQueryLog } from '#/test/quietQueryLog';
import { lastEditor } from '#/test/editorMock';
import TemplateForm from './TemplateForm';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);
jest.mock('@folio/stripes-components/lib/TextArea', () => require('#/test/textAreaMock').default);
jest.mock('@folio/stripes-components/lib/Editor', () => require('#/test/editorMock').default);
jest.mock('#/components/HtmlSourceEditor', () => require('#/test/htmlSourceEditorMock').default);
jest.mock('@folio/stripes/core', () => require('#/test/stripesCore').makeStripesCoreMock(() => mockOkapi));

const PRESETS = [
  {
    title: 'Received item notification',
    purpose: 'email',
    contentType: 'text',
    subject: 'Your requested item is ready',
    body: 'Your requested item has been received.',
    labels: ['received-notification'],
    audience: 'patron',
  },
  {
    title: 'Scheduled pullslips email template',
    purpose: 'email',
    contentType: 'text',
    subject: 'Pull slips',
    body: 'Matched {{fullCount}} requests.',
    labels: ['pullslip-email'],
    audience: 'staff',
  },
];

const EXISTING_TEMPLATES = {
  about: { count: 1 },
  items: [{
    title: 'Local notification',
    purpose: 'email',
    labels: ['locally-invented'],
  }],
};

const PLACEHOLDERS = {
  singleRecord: [
    { placeholder: '{{.Title}}', description: 'Title of the requested item' },
    { placeholder: '{{.ReqId}}', description: 'Requester request identifier' },
  ],
  batchRecord: [
    { placeholder: '{{.FullCount}}', description: 'Total number of requests matched by the batch query' },
    { placeholder: '{{.BatchId}}', description: 'Batch identifier' },
  ],
};

const baseInitial = {
  title: '',
  purpose: 'email',
  contentType: 'text',
  subject: '',
  body: '',
  labels: [''],
  audience: '',
};

const htmlValues = { ...baseInitial, title: 'T', subject: 'S', labels: ['l'], contentType: 'html', body: '<p>Hi</p>' };

const byId = (id) => document.getElementById(id);
// jsdom clicks don't focus the trigger that Modal restores on close.
const openPicker = (id) => {
  byId(id).focus();
  fireEvent.click(byId(id));
};

const placeCursor = (element, offset) => {
  element.setSelectionRange(offset, offset);
  // fireEvent.select would also focus outside act().
  fireEvent(element, new Event('select'));
};
const save = () => byId('clickable-save-template');

const fillRequired = () => {
  fireEvent.change(byId('template-title'), { target: { value: 'Received' } });
  fireEvent.change(byId('template-subject'), { target: { value: 'Ready' } });
  fireEvent.change(byId('template-body'), { target: { value: 'Your item is ready' } });
  fireEvent.change(byId('template-label-labels[0]'), { target: { value: 'received-notification' } });
};

// Presets and stored labels are fetched on mount and only seed optional controls, so most
// tests here have no reason to wait for them. Settle so they land inside the test that
// started them rather than after it.
const renderForm = async (onSubmit, { initialValues = baseInitial, ...props } = {}) => {
  const rendered = renderWithRs(
    <Paneset>
      <TemplateForm
        initialValues={initialValues}
        onSubmit={onSubmit}
        onClose={() => {}}
        title="Test"
        submitLabelId="ui-rs.create"
        {...props}
      />
    </Paneset>,
  );
  await settleQueries(rendered.queryClient);
  return rendered;
};

describe('TemplateForm', () => {
  // One test drops the preset responses on purpose, and one has the broker reject a template.
  quietQueryLog(/^(Unexpected Okapi request|sample long: )/);

  beforeEach(() => {
    jest.clearAllMocks();
    lastEditor.selection = null;
    mockOkapi.setResponses({
      'broker/state_model/templates': PRESETS,
      'broker/templates': EXISTING_TEMPLATES,
      'broker/templates/placeholders': PLACEHOLDERS,
    });
  });

  it('disables save until title, subject, body and a label are present', async () => {
    await renderForm(jest.fn());

    expect(save()).toBeDisabled();
    fillRequired();
    await waitFor(() => expect(save()).not.toBeDisabled());
  });

  it('submits the entered values', async () => {
    const onSubmit = jest.fn();
    await renderForm(onSubmit);

    fillRequired();
    await waitFor(() => expect(save()).not.toBeDisabled());
    fireEvent.click(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: 'Received',
      purpose: 'email',
      subject: 'Ready',
      labels: ['received-notification'],
    });
  });

  it('requires no subject for a pull slip template, which never uses one', async () => {
    await renderForm(jest.fn());

    fireEvent.change(byId('template-title'), { target: { value: 'Slip' } });
    fireEvent.change(byId('template-body'), { target: { value: 'Body' } });
    fireEvent.change(byId('template-label-labels[0]'), { target: { value: 'slip' } });
    fireEvent.change(byId('template-purpose'), { target: { value: 'pullslip' } });

    await waitFor(() => expect(save()).not.toBeDisabled());
    expect(byId('template-subject')).toBeDisabled();
    expect(byId('template-placeholder')).toBeInTheDocument();

    fireEvent.focus(byId('template-subject'));
    byId('template-body').setSelectionRange(4, 4);
    fireEvent.click(byId('template-placeholder'));
    fireEvent.click(await screen.findByRole('checkbox', { name: /\{\{\.ReqId\}\}/ }));
    fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.placeholders.insert' }));

    expect(byId('template-subject')).toHaveValue('');
    expect(byId('template-body')).toHaveValue('Body{{.ReqId}}');
  });

  // Only that the HTML branch mounts: with the editor stubbed, nothing here can say
  // anything about rich-text behaviour, which is verified by hand for now.
  it('renders a body field for an HTML template', async () => {
    await renderForm(jest.fn(), {
      editing: true,
      initialValues: { ...baseInitial, title: 'T', subject: 'S', body: '<p>Hi</p>', labels: ['l'], contentType: 'html' },
    });

    await waitFor(() => expect(byId('template-body')).toBeInTheDocument());
    expect(byId('template-body').value).toBe('<p>Hi</p>');
  });

  describe('switching content type', () => {
    const setType = (value) => fireEvent.change(byId('template-contentType'), { target: { value } });

    it('escapes plain text so it survives the move into the editor', async () => {
      await renderForm(jest.fn());

      fireEvent.change(byId('template-body'), { target: { value: 'Dear <name>,' } });
      setType('html');

      expect(byId('template-body').value).toBe('Dear &lt;name&gt;,');
    });

    it('leaves markup alone on the way back through text', async () => {
      await renderForm(jest.fn(), {
        editing: true,
        initialValues: { ...baseInitial, title: 'T', subject: 'S', labels: ['l'], contentType: 'html', body: '<p>Hello</p>' },
      });

      setType('text');
      expect(byId('template-body').value).toBe('<p>Hello</p>');
      // The body still holds markup, so returning to HTML must not escape it.
      setType('html');
      expect(byId('template-body').value).toBe('<p>Hello</p>');
    });

    it('does not escape the escapes when toggled repeatedly', async () => {
      await renderForm(jest.fn());

      fireEvent.change(byId('template-body'), { target: { value: 'R&D' } });
      setType('html');
      setType('text');
      setType('html');

      expect(byId('template-body').value).toBe('R&amp;D');
    });
  });

  describe('editing HTML source', () => {
    it('is not offered for a plain text template, which is already its own source', async () => {
      await renderForm(jest.fn());

      expect(byId('template-body-source')).toBeNull();
    });

    it('shows the markup unescaped', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: htmlValues });

      fireEvent.click(byId('template-body-source'));

      expect(byId('template-body').value).toBe('<p>Hi</p>');
      expect(screen.queryByText('ui-rs.settings.templates.wysiwyg.heading')).toBeNull();
    });

    it('confirms before returning to the editor, which cannot hold every markup', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: htmlValues });

      fireEvent.click(byId('template-body-source'));
      fireEvent.change(byId('template-body'), { target: { value: '<table><tr><td>x</td></tr></table>' } });
      fireEvent.click(byId('template-body-source'));

      expect(await screen.findByText('ui-rs.settings.templates.wysiwyg.heading')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.wysiwyg.confirm' }));

      // Confirming switches widget only: the body is Quill's problem now, not ours.
      await waitFor(() => expect(byId('template-body').value).toBe('<table><tr><td>x</td></tr></table>'));
    });

    it('keeps the source open when the confirmation is declined', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: htmlValues });

      fireEvent.click(byId('template-body-source'));
      fireEvent.click(byId('template-body-source'));
      fireEvent.click(await screen.findByRole('button', { name: 'stripes-components.cancel' }));

      await waitFor(() => expect(byId('template-body-source')).toBeChecked());
    });
  });

  describe('a pull slip body', () => {
    const slip = '<table style="width: 100%"><tr><td>{{.Title}}</td></tr></table>';
    const slipValues = { ...baseInitial, title: 'Slip', purpose: 'pullslip', labels: ['slip'], contentType: 'html', body: slip };

    it('is edited as source, with no rich-text editor on offer', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: slipValues });

      expect(byId('template-body-source')).toBeNull();
      expect(byId('template-body').value).toBe(slip);
    });

    it('saves the markup as typed', async () => {
      const onSubmit = jest.fn();
      await renderForm(onSubmit, { editing: true, initialValues: slipValues });

      const edited = slip.replace('100%', '50%');
      fireEvent.change(byId('template-body'), { target: { value: edited } });
      await waitFor(() => expect(save()).not.toBeDisabled());
      fireEvent.click(save());

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].body).toBe(edited);
    });

    it('takes a placeholder at the source cursor', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: { ...slipValues, body: '<p></p>' } });
      const source = byId('template-body');
      placeCursor(source, 3);
      expect(byId('template-placeholder')).toBeNull();

      openPicker('template-body-placeholder');
      fireEvent.click(await screen.findByRole('checkbox', { name: /\{\{\.ReqId\}\}/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.placeholders.insert' }));

      expect(source.value).toBe('<p>{{.ReqId}}</p>');
      expect(source).toHaveFocus();
    });
  });

  describe('the preview workspace', () => {
    const slip = '<p>\n{{.Title}}\n</p>';
    const slipValues = { ...baseInitial, title: 'Slip', purpose: 'pullslip', labels: ['slip '], contentType: 'html', body: slip };
    const pdf = { blob: async () => new Blob(['%PDF-1.7'], { type: 'application/pdf' }) };
    const previewCalls = () => mockOkapi.post.mock.calls.filter(([path]) => path === 'broker/templates/preview');
    const rejection = (error, template) => Object.assign(new Error(error), { status: 400, parsedBody: { error, template } });
    const openPreview = async () => {
      fireEvent.click(byId('template-body-preview'));
      await waitFor(() => expect(byId('template-preview-pdf')).toBeInTheDocument());
    };

    beforeEach(() => {
      mockOkapi.post.mockImplementation(async () => pdf);
    });

    it('is offered for a pull slip but not for an email', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: htmlValues });
      fireEvent.click(byId('template-body-source'));
      expect(byId('template-body-preview')).toBeNull();
    });

    it('renders the body against the samples beside the editor', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: slipValues });

      await openPreview();

      await waitFor(() => expect(screen.getByTitle('ui-rs.settings.templates.preview.heading')).toBeInTheDocument());
      expect(previewCalls()[0][1]).toEqual({ json: { body: slip, labels: ['slip'] } });
      expect(byId('template-preview-editor')).toContainElement(byId('template-body'));
    });

    it('renders again once typing pauses', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: slipValues });
      await openPreview();
      await waitFor(() => expect(previewCalls()).toHaveLength(1));

      fireEvent.change(byId('template-body'), { target: { value: '<p>{{.Author}}</p>' } });
      expect(previewCalls()).toHaveLength(1);

      await waitFor(() => expect(previewCalls()).toHaveLength(2), { timeout: 2000 });
      expect(previewCalls()[1][1].json.body).toBe('<p>{{.Author}}</p>');
    });

    it('shows a template error with its line and sample, keeping the last slips', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: slipValues });
      await openPreview();
      await waitFor(() => expect(screen.getByTitle('ui-rs.settings.templates.preview.heading')).toBeInTheDocument());

      mockOkapi.post.mockRejectedValueOnce(rejection('sample long: template body: template: template:2:3: index out of range', {
        part: 'body', sample: 'long', line: 2, column: 3, message: 'index out of range',
      }));
      fireEvent.change(byId('template-body'), { target: { value: `${slip} ` } });
      fireEvent.click(byId('template-preview-refresh'));

      expect(await screen.findByText('ui-rs.settings.templates.preview.errorSample')).toBeInTheDocument();
      expect(screen.getByTitle('ui-rs.settings.templates.preview.heading')).toBeInTheDocument();
    });

    it('saves from the workspace', async () => {
      const onSubmit = jest.fn();
      await renderForm(onSubmit, { editing: true, initialValues: slipValues });
      await openPreview();

      fireEvent.change(byId('template-body'), { target: { value: '<p>Edited</p>' } });
      await waitFor(() => expect(save()).not.toBeDisabled());
      expect(byId('template-preview-editor')).toContainElement(save());
      fireEvent.click(save());

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].body).toBe('<p>Edited</p>');
    });

    it('hands the body back to the form when closed, keeping what was typed', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: slipValues });
      await openPreview();
      fireEvent.change(byId('template-body'), { target: { value: '<p>Edited</p>' } });

      fireEvent.click(within(byId('template-preview-pdf')).getByRole('button', { name: /close/i }));

      await waitFor(() => expect(byId('template-preview-pdf')).toBeNull());
      expect(byId('template-body').value).toBe('<p>Edited</p>');
      expect(byId('template-body')).toHaveFocus();
    });
  });

  // When Quill re-parses a stored body it reports a change with source `api` rather
  // than `user`. The stub lets these tests send that report by hand; they cover how
  // the form reacts to it, not whether Quill would really rewrite this markup.
  describe('changes the editor makes by itself', () => {
    const renderHtml = async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: htmlValues });
      await waitFor(() => expect(byId('template-body')).toBeInTheDocument());
    };

    it('keeps the stored body, so an untouched template saves back unchanged', async () => {
      await renderHtml();
      act(() => lastEditor.onChange('<p>Hi</p><p><br></p>', null, 'api'));
      expect(byId('template-body').value).toBe('<p>Hi</p>');
      expect(save()).toBeDisabled();
    });

    it('points at the source view once it has dropped one', async () => {
      await renderHtml();
      act(() => lastEditor.onChange('<p>Hi</p><p><br></p>', null, 'api'));
      expect(byId('template-body-rewrite')).toBeInTheDocument();
    });

    it('stays quiet when the editor returns the body as it was', async () => {
      await renderHtml();
      act(() => lastEditor.onChange('<p>Hi</p>', null, 'api'));
      expect(byId('template-body-rewrite')).toBeNull();
    });

    it('lets a typed edit through', async () => {
      await renderHtml();
      act(() => lastEditor.onChange('<p>Edited</p>', null, 'user'));
      expect(byId('template-body').value).toBe('<p>Edited</p>');
      await waitFor(() => expect(save()).not.toBeDisabled());
    });
  });

  it('fixes the purpose of an existing template', async () => {
    await renderForm(jest.fn(), { editing: true, initialValues: { ...baseInitial, title: 'T', body: 'B', subject: 'S', labels: ['l'] } });

    expect(byId('template-purpose')).toBeDisabled();
  });

  it('offers "both" when editing a template that has an audience, which PUT can now restore', async () => {
    await renderForm(jest.fn(), {
      editing: true,
      initialValues: { ...baseInitial, title: 'T', body: 'B', subject: 'S', labels: ['l'], audience: 'patron' },
    });

    expect([...byId('template-audience').options].map(opt => opt.value)).toEqual(['', 'patron', 'staff']);
  });

  describe('placeholders', () => {
    const editingValues = {
      ...baseInitial,
      title: 'T',
      subject: 'Hello world',
      body: 'Request details',
      labels: ['notice'],
    };

    it('shows the broker placeholders in their data-source groups', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: editingValues });

      fireEvent.click(byId('template-placeholder'));

      expect(await screen.findByText('{{.ReqId}}')).toBeInTheDocument();
      expect(screen.getByText('{{.FullCount}}')).toBeInTheDocument();
      expect(screen.getByText('ui-rs.settings.templates.placeholders.singleRecord')).toBeInTheDocument();
      expect(screen.getByText('ui-rs.settings.templates.placeholders.batchRecord')).toBeInTheDocument();
    });

    it('uses a large modal for the three-column placeholder grid', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: editingValues });

      fireEvent.click(byId('template-placeholder'));

      expect(screen.getByRole('dialog').firstElementChild).toHaveClass('large');
    });

    it('orders placeholders alphabetically within each group', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: editingValues });

      fireEvent.click(byId('template-placeholder'));

      await screen.findByText('{{.ReqId}}');
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings.map(heading => heading.textContent)).toEqual([
        'ui-rs.settings.templates.placeholders.singleRecord',
        'ui-rs.settings.templates.placeholders.batchRecord',
      ]);

      const placeholdersIn = (section) => [...section.querySelectorAll('code')]
        .map(element => element.textContent);
      expect(placeholdersIn(headings[0].closest('section'))).toEqual([
        '{{.ReqId}}',
        '{{.Title}}',
      ]);
      expect(placeholdersIn(headings[1].closest('section'))).toEqual([
        '{{.BatchId}}',
        '{{.FullCount}}',
      ]);
    });

    it('offers placeholders while creating a template', async () => {
      await renderForm(jest.fn());

      fireEvent.click(byId('template-placeholder'));

      expect(await screen.findByText('{{.ReqId}}')).toBeInTheDocument();
      expect(byId('template-placeholder')).toBeInTheDocument();
    });

    it('inserts selected placeholders at the subject cursor', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: editingValues });
      const subject = byId('template-subject');
      subject.setSelectionRange(6, 6);
      fireEvent.focus(subject);

      openPicker('template-placeholder');
      fireEvent.click(await screen.findByRole('checkbox', { name: /\{\{\.ReqId\}\}/ }));
      fireEvent.click(screen.getByRole('checkbox', { name: /\{\{\.Title\}\}/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.placeholders.insert' }));

      expect(subject.value).toBe('Hello {{.ReqId}} {{.Title}}world');
      expect(subject).toHaveFocus();
      expect(subject.selectionStart).toBe('Hello {{.ReqId}} {{.Title}}'.length);
    });

    it('inserts a selected placeholder at the body cursor', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: editingValues });
      const body = byId('template-body');
      body.setSelectionRange(8, 8);
      fireEvent.focus(body);

      openPicker('template-placeholder');
      fireEvent.click(await screen.findByRole('checkbox', { name: /\{\{\.FullCount\}\}/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.placeholders.insert' }));

      expect(body.value).toBe('Request {{.FullCount}}details');
      expect(body).toHaveFocus();
      expect(body.selectionStart).toBe('Request {{.FullCount}}'.length);
    });

    it('switches the shared insertion target to the most recently focused field', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: editingValues });
      const subject = byId('template-subject');
      const body = byId('template-body');
      subject.setSelectionRange(6, 6);
      fireEvent.focus(subject);
      body.setSelectionRange(8, 8);
      fireEvent.focus(body);

      fireEvent.click(byId('template-placeholder'));
      fireEvent.click(await screen.findByRole('checkbox', { name: /\{\{\.FullCount\}\}/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.placeholders.insert' }));

      expect(subject.value).toBe('Hello world');
      expect(body.value).toBe('Request {{.FullCount}}details');
    });

    it('inserts a selected placeholder at the rich-text cursor', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: htmlValues });
      lastEditor.setSelection(2);
      lastEditor.blur();

      openPicker('template-placeholder');
      fireEvent.click(await screen.findByRole('checkbox', { name: /\{\{\.ReqId\}\}/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.placeholders.insert' }));

      expect(byId('template-body').value).toBe('<p>Hi{{.ReqId}}</p>');
      expect(byId('template-body')).toHaveFocus();
    });

    it('inserts at the source cursor after the rich-text editor unmounts', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: htmlValues });
      fireEvent.click(byId('template-body-source'));
      const source = byId('template-body');
      placeCursor(source, 3);

      fireEvent.click(byId('template-placeholder'));
      fireEvent.click(await screen.findByRole('checkbox', { name: /\{\{\.ReqId\}\}/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.placeholders.insert' }));

      expect(source.value).toBe('<p>{{.ReqId}}Hi</p>');
    });

    it('discards the rich-text selection when the body is replaced', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: htmlValues });
      lastEditor.setSelection(1, 1);
      lastEditor.blur();
      act(() => lastEditor.onChange('<p>Changed</p>', null, 'user'));

      fireEvent.click(byId('template-placeholder'));
      fireEvent.click(await screen.findByRole('checkbox', { name: /\{\{\.ReqId\}\}/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.placeholders.insert' }));

      expect(byId('template-body').value).toBe('<p>Changed{{.ReqId}}</p>');
    });

    it('discards the rich-text selection when the editor remounts', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: htmlValues });
      lastEditor.setSelection(1, 1);
      lastEditor.blur();
      fireEvent.click(byId('template-body-source'));
      fireEvent.click(byId('template-body-source'));
      fireEvent.click(await screen.findByRole('button', { name: 'ui-rs.settings.templates.wysiwyg.confirm' }));
      await waitFor(() => expect(byId('template-body-source')).not.toBeChecked());

      fireEvent.click(byId('template-placeholder'));
      fireEvent.click(await screen.findByRole('checkbox', { name: /\{\{\.ReqId\}\}/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.placeholders.insert' }));

      expect(byId('template-body').value).toBe('<p>Hi{{.ReqId}}</p>');
    });

    it('keeps editing available when placeholders cannot be fetched', async () => {
      mockOkapi.setResponses({
        'broker/state_model/templates': PRESETS,
        'broker/templates': EXISTING_TEMPLATES,
      });
      await renderForm(jest.fn(), { editing: true, initialValues: editingValues });

      fireEvent.click(byId('template-placeholder'));

      expect(await screen.findByText('ui-rs.settings.templates.placeholders.unavailable')).toBeInTheDocument();
      expect(byId('template-subject')).toBeEnabled();
    });
  });

  describe('labels', () => {
    it('offers built-in and existing labels before a preset is selected', async () => {
      await renderForm(jest.fn(), { initialValues: { ...baseInitial, purpose: '' } });

      await waitFor(() => expect(byId('template-known-label')).toBeInTheDocument());
      expect(byId('template-preset').value).toBe('');
      expect(screen.getByRole('option', { name: 'received-notification' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'pullslip-email' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'locally-invented' })).toBeInTheDocument();
    });

    it('fills the blank row when a known label is picked', async () => {
      await renderForm(jest.fn());

      await waitFor(() => expect(byId('template-known-label')).toBeInTheDocument());
      fireEvent.change(byId('template-known-label'), { target: { value: 'pullslip-email' } });

      expect(byId('template-label-labels[0]').value).toBe('pullslip-email');
    });

    it('does not add a label twice', async () => {
      await renderForm(jest.fn());

      await waitFor(() => expect(byId('template-known-label')).toBeInTheDocument());
      fireEvent.change(byId('template-known-label'), { target: { value: 'pullslip-email' } });
      fireEvent.change(byId('template-known-label'), { target: { value: 'pullslip-email' } });

      expect(byId('template-label-labels[1]')).toBeNull();
    });

    it('accepts a label the broker has never heard of', async () => {
      const onSubmit = jest.fn();
      await renderForm(onSubmit);

      fillRequired();
      fireEvent.change(byId('template-label-labels[0]'), { target: { value: 'locally-invented' } });
      await waitFor(() => expect(save()).not.toBeDisabled());
      fireEvent.click(save());

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].labels).toEqual(['locally-invented']);
    });
  });

  describe('built-in presets', () => {
    it('seeds every field from the selected preset', async () => {
      await renderForm(jest.fn());

      await waitFor(() => expect(byId('template-preset')).toBeInTheDocument());
      fireEvent.change(byId('template-preset'), { target: { value: '0' } });

      expect(byId('template-title').value).toBe('Received item notification');
      expect(byId('template-subject').value).toBe('Your requested item is ready');
      expect(byId('template-body').value).toBe('Your requested item has been received.');
      expect(byId('template-label-labels[0]').value).toBe('received-notification');
      expect(byId('template-audience').value).toBe('patron');
    });

    it('is not offered when editing, where seeding would overwrite the record', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: { ...baseInitial, title: 'T', body: 'B', subject: 'S', labels: ['l'] } });

      await waitFor(() => expect(byId('template-known-label')).toBeInTheDocument());
      expect(byId('template-preset')).toBeNull();
    });

    it('leaves the form usable when the presets cannot be fetched', async () => {
      mockOkapi.setResponses({});
      await renderForm(jest.fn());

      fillRequired();
      await waitFor(() => expect(save()).not.toBeDisabled());
      // Without presets or existing templates there are no suggestions; labels stay free text.
      expect(byId('template-preset')).toBeNull();
      expect(byId('template-known-label')).toBeNull();
    });
  });
});
