import React from 'react';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../../test/renderWithRs';
import { makeOkapiKyMock } from '../../test/okapiKyMock';
import ScheduledActionForm from './ScheduledActionForm';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('../../test/iconMock').default);
jest.mock('@folio/stripes/core', () => require('../../test/stripesCore').makeStripesCoreMock(() => mockOkapi));

const PRESETS = [
  {
    titleKey: 'email-pullslips',
    title: 'Email pull slips ready to ship',
    actionName: 'email-pullslips',
    batchQuery: 'side = lending and state = WILL_SUPPLY',
    schedule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=6;BYMINUTE=0',
    actionParams: { to: ['staff@example.com'], templateLabel: 'pullslip-email', includePdf: true },
  },
  {
    titleKey: 'request-aging-express',
    title: 'Request aging of express requests',
    actionName: 'request-aging',
    batchQuery: '(state = VALIDATED or state = WILL_SUPPLY) and service_level = Express',
    schedule: 'FREQ=MINUTELY;INTERVAL=15',
    actionParams: { interval: '2h' },
  },
];

const TEMPLATES = {
  items: [
    { id: 't1', title: 'Scheduled pullslips', purpose: 'email', audience: 'staff', labels: ['pullslip-email'] },
    { id: 't2', title: 'Patron notice', purpose: 'email', audience: 'patron', labels: ['received-notification'] },
  ],
};

const baseInitial = {
  actionName: 'email-pullslips',
  frequency: 'weekly',
  days: [],
  hours: '',
  minute: 0,
  interval: '',
  batchQuery: '',
  actionParams: { includePdf: false },
};

const ATTACH_PDF = 'ui-rs.settings.scheduledActions.params.includePdf';
const RECIPIENT_0 = 'scheduled-action-email-to-actionParams.to[0]';
const TEMPLATE_NONE = 'Create an email template for staff first';
const messages = {
  'ui-rs.settings.scheduledActions.unsupportedSchedule': '{schedule}',
  'ui-rs.settings.scheduledActions.preset.email-pullslips': 'Zettel mailen',
  'ui-rs.settings.scheduledActions.params.templateLabelNone': TEMPLATE_NONE,
};

const byId = (id) => document.getElementById(id);
const save = () => byId('clickable-save-scheduled-action');

const fillRequired = () => {
  fireEvent.change(byId('scheduled-action-batchQuery'), { target: { value: 'state==REQ' } });
  fireEvent.change(byId('scheduled-action-hours'), { target: { value: '9' } });
  fireEvent.click(screen.getByRole('button', { name: 'Monday' }));
};

const TEMPLATE_SELECT = 'scheduled-action-email-templateLabel';

// The template options arrive from broker/templates, so the select is not there
// on first render.
const fillEmail = async () => {
  fireEvent.change(byId(RECIPIENT_0), { target: { value: 'a@lib.org' } });
  await waitFor(() => expect(byId(TEMPLATE_SELECT)).toBeInTheDocument());
  fireEvent.change(byId(TEMPLATE_SELECT), { target: { value: 'pullslip-email' } });
};

const renderForm = (onSubmit, { initialValues = baseInitial, ...props } = {}) => renderWithRs(
  <ScheduledActionForm
    initialValues={initialValues}
    onSubmit={onSubmit}
    onClose={() => {}}
    title="Test"
    submitLabelId="ui-rs.create"
    {...props}
  />,
  { messages },
);

describe('ScheduledActionForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOkapi.setResponses({
      'broker/state_model/batch_actions': PRESETS,
      'broker/templates': TEMPLATES,
    });
  });

  it('disables save until the query, an hour and a day are valid', async () => {
    renderForm(jest.fn());

    expect(save()).toBeDisabled();
    await fillEmail();
    fillRequired();
    await waitFor(() => expect(save()).not.toBeDisabled());

    fireEvent.change(byId('scheduled-action-hours'), { target: { value: '24' } });
    await waitFor(() => expect(save()).toBeDisabled());

    fireEvent.change(byId('scheduled-action-hours'), { target: { value: '9' } });
    fireEvent.change(byId('scheduled-action-minute'), { target: { value: '60' } });
    await waitFor(() => expect(save()).toBeDisabled());
  });

  it('includes the schedule fields and email params in the submit payload', async () => {
    const onSubmit = jest.fn();
    renderForm(onSubmit);

    fillRequired();
    fireEvent.change(byId('scheduled-action-minute'), { target: { value: '30' } });
    await fillEmail();
    fireEvent.click(screen.getByLabelText(ATTACH_PDF));

    fireEvent.click(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0];
    expect(values.actionName).toBe('email-pullslips');
    expect(values.days).toEqual([1]);
    expect(values.hours).toBe('9');
    expect(values.minute).toBe('30');
    expect(values.actionParams.to).toEqual(['a@lib.org']);
    expect(values.actionParams.templateLabel).toBe('pullslip-email');
    expect(values.actionParams.includePdf).toBe(true);
  });

  it('keeps save disabled until a valid recipient and a template are provided', async () => {
    renderForm(jest.fn());

    fillRequired();
    await waitFor(() => expect(save()).toBeDisabled());

    await fillEmail();
    await waitFor(() => expect(save()).not.toBeDisabled());

    fireEvent.change(byId(RECIPIENT_0), { target: { value: 'not-an-email' } });
    await waitFor(() => expect(save()).toBeDisabled());
  });

  it('warns with the cleared expression when the schedule is unsupported', () => {
    renderForm(jest.fn(), { unsupportedSchedule: 'FREQ=MONTHLY;BYMONTHDAY=1' });
    expect(screen.getByText('FREQ=MONTHLY;BYMONTHDAY=1')).toBeInTheDocument();
  });

  it('swaps the params block and discards the prior action\'s params on action change', async () => {
    const onSubmit = jest.fn();
    renderForm(onSubmit);

    fireEvent.click(screen.getByLabelText(ATTACH_PDF));
    fireEvent.change(byId('scheduled-action-actionName'), { target: { value: 'request-aging' } });

    await waitFor(() => expect(byId('scheduled-action-age-interval')).toBeInTheDocument());
    expect(screen.queryByLabelText(ATTACH_PDF)).toBeNull();

    fillRequired();
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0];
    expect(values.actionName).toBe('request-aging');
    expect(values.actionParams).not.toHaveProperty('includePdf');
  });

  it('fills the whole form (query, action, params and schedule) from a preset', async () => {
    renderForm(jest.fn());

    await waitFor(() => expect(byId('scheduled-action-preset')).toBeInTheDocument());

    fireEvent.change(byId('scheduled-action-preset'), { target: { value: '1' } });
    await waitFor(() => expect(byId('scheduled-action-age-interval')).toBeInTheDocument());
    expect(byId('scheduled-action-batchQuery').value).toBe(PRESETS[1].batchQuery);
    expect(byId('scheduled-action-actionName').value).toBe('request-aging');
    expect(byId('scheduled-action-age-interval').value).toBe('2h');
    expect(byId('scheduled-action-frequency').value).toBe('minutely');
    expect(byId('scheduled-action-interval').value).toBe('15');
  });

  it('labels presets by titleKey, falling back to the title the broker sent', async () => {
    renderForm(jest.fn());

    await waitFor(() => expect(byId('scheduled-action-preset')).toBeInTheDocument());
    expect(screen.getByRole('option', { name: 'Zettel mailen' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: PRESETS[1].title })).toBeInTheDocument();
  });

  // Which templates qualify is mapping.test.js's job; this only passes if the scope
  // handed to it (email, staff) reached the query.
  it('takes a preset\'s suggested template label when a template carries it', async () => {
    renderForm(jest.fn());

    await waitFor(() => expect(byId('scheduled-action-preset')).toBeInTheDocument());
    fireEvent.change(byId('scheduled-action-preset'), { target: { value: '0' } });

    await waitFor(() => expect(byId(TEMPLATE_SELECT).value).toBe('pullslip-email'));
  });

  it('drops a suggested label no template carries, leaving the field to be filled', async () => {
    // The broker suggests labels but never creates the templates behind them.
    mockOkapi.setResponses({
      'broker/state_model/batch_actions': PRESETS,
      'broker/templates': { items: [{ id: 't3', title: 'Nightly', purpose: 'email', audience: 'staff', labels: ['nightly'] }] },
    });
    renderForm(jest.fn());

    await waitFor(() => expect(byId('scheduled-action-preset')).toBeInTheDocument());
    fireEvent.change(byId('scheduled-action-preset'), { target: { value: '0' } });

    await waitFor(() => expect(byId('scheduled-action-batchQuery').value).toBe(PRESETS[0].batchQuery));
    expect(byId(TEMPLATE_SELECT).value).toBe('');
    expect(save()).toBeDisabled();
  });

  it('explains how to create a template when none is available, blocking save', async () => {
    mockOkapi.setResponses({
      'broker/state_model/batch_actions': PRESETS,
      'broker/templates': { items: [] },
    });
    renderForm(jest.fn());

    await waitFor(() => expect(screen.getByText(TEMPLATE_NONE)).toBeInTheDocument());
    expect(byId(TEMPLATE_SELECT)).toBeNull();

    fillRequired();
    fireEvent.change(byId(RECIPIENT_0), { target: { value: 'a@lib.org' } });
    await waitFor(() => expect(save()).toBeDisabled());
  });

  it('in hourly mode, save gates on a query and a valid minute (no days/hours)', async () => {
    renderForm(jest.fn());
    fireEvent.change(byId('scheduled-action-actionName'), { target: { value: 'request-aging' } });
    await waitFor(() => expect(byId('scheduled-action-age-interval')).toBeInTheDocument());

    fireEvent.change(byId('scheduled-action-frequency'), { target: { value: 'hourly' } });
    await waitFor(() => expect(byId('scheduled-action-minute')).toBeInTheDocument());
    expect(byId('scheduled-action-days')).toBeNull();
    expect(byId('scheduled-action-hours')).toBeNull();

    expect(save()).toBeDisabled();
    fireEvent.change(byId('scheduled-action-batchQuery'), { target: { value: 'state==REQ' } });
    await waitFor(() => expect(save()).not.toBeDisabled());

    fireEvent.change(byId('scheduled-action-minute'), { target: { value: '60' } });
    await waitFor(() => expect(save()).toBeDisabled());
  });

  it('in minutely mode, save requires a positive interval and submits it', async () => {
    const onSubmit = jest.fn();
    renderForm(onSubmit);
    fireEvent.change(byId('scheduled-action-actionName'), { target: { value: 'request-aging' } });
    await waitFor(() => expect(byId('scheduled-action-age-interval')).toBeInTheDocument());
    fireEvent.change(byId('scheduled-action-batchQuery'), { target: { value: 'state==REQ' } });

    fireEvent.change(byId('scheduled-action-frequency'), { target: { value: 'minutely' } });
    await waitFor(() => expect(byId('scheduled-action-interval')).toBeInTheDocument());
    expect(save()).toBeDisabled();
    fireEvent.change(byId('scheduled-action-interval'), { target: { value: '15' } });
    await waitFor(() => expect(save()).not.toBeDisabled());

    fireEvent.change(byId('scheduled-action-interval'), { target: { value: '0' } });
    await waitFor(() => expect(save()).toBeDisabled());

    fireEvent.change(byId('scheduled-action-interval'), { target: { value: '15' } });
    await waitFor(() => expect(save()).not.toBeDisabled());
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0];
    expect(values.frequency).toBe('minutely');
    expect(values.interval).toBe('15');
  });

  it('renders without a preset picker when the defaults endpoint is unavailable', async () => {
    // Silence the expected react-query error for the missing mock response.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockOkapi.setResponses({});
    renderForm(jest.fn());

    await waitFor(() => expect(byId('scheduled-action-actionName')).toBeInTheDocument());
    expect(byId('scheduled-action-preset')).toBeNull();
    expect(byId('scheduled-action-batchQuery').value).toBe('');
    errorSpy.mockRestore();
  });

  it('omits the preset picker when editing', async () => {
    renderForm(jest.fn(), { editing: true });

    await waitFor(() => expect(byId('scheduled-action-actionName')).toBeInTheDocument());
    expect(byId('scheduled-action-preset')).toBeNull();
  });
});
