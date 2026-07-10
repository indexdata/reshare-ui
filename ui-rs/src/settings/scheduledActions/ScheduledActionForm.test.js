import React from 'react';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../../test/renderWithRs';
import { makeOkapiKyMock } from '../../test/okapiKyMock';
import ScheduledActionForm from './ScheduledActionForm';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('../../test/iconMock').default);
jest.mock('@folio/stripes/core', () => require('../../test/stripesCore').makeStripesCoreMock(() => mockOkapi));

const TEMPLATES = [
  {
    title: 'Email pull slips ready to ship',
    actionName: 'email-pullslips',
    batchQuery: 'side = lending and state = WILL_SUPPLY',
    schedule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=6;BYMINUTE=0',
    actionParams: { to: ['staff@example.com'], subject: 'Pull slips', body: 'See attached', includePdf: true },
  },
  {
    title: 'Request aging of express requests',
    actionName: 'request-aging',
    batchQuery: '(state = VALIDATED or state = WILL_SUPPLY) and service_level = Express',
    schedule: 'FREQ=MINUTELY;INTERVAL=15',
    actionParams: { interval: '2h' },
  },
];

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
const messages = {
  'ui-rs.settings.scheduledActions.unsupportedSchedule': '{schedule}',
};

const byId = (id) => document.getElementById(id);
const save = () => byId('clickable-save-scheduled-action');

const fillRequired = () => {
  fireEvent.change(byId('scheduled-action-batchQuery'), { target: { value: 'state==REQ' } });
  fireEvent.change(byId('scheduled-action-hours'), { target: { value: '9' } });
  fireEvent.click(screen.getByRole('button', { name: 'Monday' }));
};

const fillEmail = () => {
  fireEvent.change(byId(RECIPIENT_0), { target: { value: 'a@lib.org' } });
  fireEvent.change(byId('scheduled-action-email-subject'), { target: { value: 'Pull slips' } });
  fireEvent.change(byId('scheduled-action-email-body'), { target: { value: 'See attached' } });
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
    mockOkapi.setResponses({ 'broker/state_model/batch_actions': TEMPLATES });
  });

  it('disables save until the query, an hour and a day are valid', async () => {
    renderForm(jest.fn());

    expect(save()).toBeDisabled();
    fillEmail();
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
    fillEmail();
    fireEvent.click(screen.getByLabelText(ATTACH_PDF));

    fireEvent.click(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0];
    expect(values.actionName).toBe('email-pullslips');
    expect(values.days).toEqual([1]);
    expect(values.hours).toBe('9');
    expect(values.minute).toBe('30');
    expect(values.actionParams.to).toEqual(['a@lib.org']);
    expect(values.actionParams.subject).toBe('Pull slips');
    expect(values.actionParams.body).toBe('See attached');
    expect(values.actionParams.includePdf).toBe(true);
  });

  it('keeps save disabled until a valid recipient, subject and body are provided', async () => {
    renderForm(jest.fn());

    fillRequired();
    await waitFor(() => expect(save()).toBeDisabled());

    fillEmail();
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

  it('fills the whole form (query, action, params and schedule) from a template', async () => {
    renderForm(jest.fn());

    await waitFor(() => expect(byId('scheduled-action-template')).toBeInTheDocument());

    fireEvent.change(byId('scheduled-action-template'), { target: { value: '1' } });
    await waitFor(() => expect(byId('scheduled-action-age-interval')).toBeInTheDocument());
    expect(byId('scheduled-action-batchQuery').value).toBe(TEMPLATES[1].batchQuery);
    expect(byId('scheduled-action-actionName').value).toBe('request-aging');
    expect(byId('scheduled-action-age-interval').value).toBe('2h');
    expect(byId('scheduled-action-frequency').value).toBe('minutely');
    expect(byId('scheduled-action-interval').value).toBe('15');
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

  it('renders without a template picker when the defaults endpoint is unavailable', async () => {
    // Silence the expected react-query error for the missing mock response.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockOkapi.setResponses({});
    renderForm(jest.fn());

    await waitFor(() => expect(byId('scheduled-action-actionName')).toBeInTheDocument());
    expect(byId('scheduled-action-template')).toBeNull();
    expect(byId('scheduled-action-batchQuery').value).toBe('');
    errorSpy.mockRestore();
  });

  it('omits the template picker when editing', async () => {
    renderForm(jest.fn(), { editing: true });

    await waitFor(() => expect(byId('scheduled-action-actionName')).toBeInTheDocument());
    expect(byId('scheduled-action-template')).toBeNull();
  });
});
