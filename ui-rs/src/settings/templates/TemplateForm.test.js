import React from 'react';
import { act, fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs, settleQueries } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import { quietQueryLog } from '#/test/quietQueryLog';
import { lastEditor } from '#/test/editorMock';
import TemplateForm from './TemplateForm';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);
jest.mock('@folio/stripes-components/lib/TextArea', () => require('#/test/textAreaMock').default);
jest.mock('@folio/stripes-components/lib/Editor', () => require('#/test/editorMock').default);
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
    { placeholder: '{{.ReqId}}', description: 'Requester request identifier' },
    { placeholder: '{{.Title}}', description: 'Title of the requested item' },
  ],
  batchRecord: [
    { placeholder: '{{.FullCount}}', description: 'Total number of requests matched by the batch query' },
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
    <TemplateForm
      initialValues={initialValues}
      onSubmit={onSubmit}
      onClose={() => {}}
      title="Test"
      submitLabelId="ui-rs.create"
      {...props}
    />,
  );
  await settleQueries(rendered.queryClient);
  return rendered;
};

describe('TemplateForm', () => {
  quietQueryLog(/^Unexpected Okapi request/); // one test drops the preset responses on purpose

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

      fireEvent.click(byId('template-subject-placeholder'));

      expect(await screen.findByText('{{.ReqId}}')).toBeInTheDocument();
      expect(screen.getByText('Requester request identifier')).toBeInTheDocument();
      expect(screen.getByText('{{.FullCount}}')).toBeInTheDocument();
      expect(screen.getByText('Total number of requests matched by the batch query')).toBeInTheDocument();
      expect(screen.getByText('ui-rs.settings.templates.placeholders.singleRecord')).toBeInTheDocument();
      expect(screen.getByText('ui-rs.settings.templates.placeholders.batchRecord')).toBeInTheDocument();
    });

    it('offers placeholders while creating a template', async () => {
      await renderForm(jest.fn());

      fireEvent.click(byId('template-subject-placeholder'));

      expect(await screen.findByText('{{.ReqId}}')).toBeInTheDocument();
      expect(byId('template-body-placeholder')).toBeInTheDocument();
    });

    it('inserts selected placeholders at the subject cursor', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: editingValues });
      const subject = byId('template-subject');
      subject.setSelectionRange(6, 6);

      fireEvent.click(byId('template-subject-placeholder'));
      fireEvent.click(await screen.findByRole('checkbox', { name: /\{\{\.ReqId\}\}/ }));
      fireEvent.click(screen.getByRole('checkbox', { name: /\{\{\.Title\}\}/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.placeholders.insert' }));

      expect(subject.value).toBe('Hello {{.ReqId}} {{.Title}}world');
    });

    it('inserts a selected placeholder at the body cursor', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: editingValues });
      const body = byId('template-body');
      body.setSelectionRange(8, 8);

      fireEvent.click(byId('template-body-placeholder'));
      fireEvent.click(await screen.findByRole('checkbox', { name: /\{\{\.FullCount\}\}/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.placeholders.insert' }));

      expect(body.value).toBe('Request {{.FullCount}}details');
    });

    it('inserts a selected placeholder at the rich-text cursor', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: htmlValues });
      lastEditor.setSelection(2);
      lastEditor.blur();

      fireEvent.click(byId('template-body-placeholder'));
      fireEvent.click(await screen.findByRole('checkbox', { name: /\{\{\.ReqId\}\}/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.placeholders.insert' }));

      expect(byId('template-body').value).toBe('<p>Hi{{.ReqId}}</p>');
    });

    it('inserts at the source cursor after the rich-text editor unmounts', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: htmlValues });
      fireEvent.click(byId('template-body-source'));
      const source = byId('template-body');
      source.setSelectionRange(3, 3);

      fireEvent.click(byId('template-body-placeholder'));
      fireEvent.click(await screen.findByRole('checkbox', { name: /\{\{\.ReqId\}\}/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.templates.placeholders.insert' }));

      expect(source.value).toBe('<p>{{.ReqId}}Hi</p>');
    });

    it('discards the rich-text selection when the body is replaced', async () => {
      await renderForm(jest.fn(), { editing: true, initialValues: htmlValues });
      lastEditor.setSelection(1, 1);
      lastEditor.blur();
      act(() => lastEditor.onChange('<p>Changed</p>', null, 'user'));

      fireEvent.click(byId('template-body-placeholder'));
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

      fireEvent.click(byId('template-body-placeholder'));
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

      fireEvent.click(byId('template-subject-placeholder'));

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
