import React from 'react';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../../test/renderWithRs';
import ScheduledActionForm from './ScheduledActionForm';

jest.mock('@folio/stripes-components/lib/Icon', () => require('../../test/iconMock').default);
jest.mock('@folio/stripes/core', () => require('../../test/stripesCore').makeStripesCoreMock(() => ({})));

const baseInitial = {
  actionName: 'email-pullslips',
  days: [],
  hours: '',
  minute: 0,
  batchQuery: '',
  actionParams: { includePdf: false },
};

const ATTACH_PDF = 'ui-rs.settings.scheduledActions.params.includePdf';
const RECIPIENT_0 = 'scheduled-action-email-to-actionParams.to[0]';
// Placeholder-only so the warning test asserts the {schedule} substitution itself.
const messages = {
  'ui-rs.settings.scheduledActions.unsupportedSchedule': '{schedule}',
};

const byId = (id) => document.getElementById(id);
const save = () => byId('clickable-save-scheduled-action');

// Populate the three things a valid schedule needs: a query, an hour, and a day.
const fillRequired = () => {
  fireEvent.change(byId('scheduled-action-batchQuery'), { target: { value: 'state==REQ' } });
  fireEvent.change(byId('scheduled-action-hours'), { target: { value: '9' } });
  fireEvent.click(screen.getByRole('button', { name: 'Monday' }));
};

// Populate the email-pullslips params the broker requires. A first recipient row
// is seeded on mount, so we just fill it in along with the subject and body.
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
  beforeEach(() => jest.clearAllMocks());

  it('disables save until the query, an hour and a day are valid', async () => {
    renderForm(jest.fn());

    expect(save()).toBeDisabled();
    fillEmail();
    fillRequired();
    await waitFor(() => expect(save()).not.toBeDisabled());

    // An out-of-range hour re-disables it.
    fireEvent.change(byId('scheduled-action-hours'), { target: { value: '24' } });
    await waitFor(() => expect(save()).toBeDisabled());

    // A minute of 60+ also re-disables it.
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

    // Schedule is valid but the email params the broker requires are missing.
    fillRequired();
    await waitFor(() => expect(save()).toBeDisabled());

    fillEmail();
    await waitFor(() => expect(save()).not.toBeDisabled());

    // A malformed address re-disables it.
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

    // Set an email-only param, then switch to a different action type.
    fireEvent.click(screen.getByLabelText(ATTACH_PDF));
    fireEvent.change(byId('scheduled-action-actionName'), { target: { value: 'age-requests' } });

    // The email block is replaced by the age-requests block...
    await waitFor(() => expect(byId('scheduled-action-age-interval')).toBeInTheDocument());
    expect(screen.queryByLabelText(ATTACH_PDF)).toBeNull();

    // ...and the discarded param doesn't leak into the submitted payload.
    fillRequired();
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0];
    expect(values.actionName).toBe('age-requests');
    expect(values.actionParams).not.toHaveProperty('includePdf');
  });
});
