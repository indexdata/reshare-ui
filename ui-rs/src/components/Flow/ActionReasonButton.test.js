import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@folio/jest-config-stripes/testing-library/react';
import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import { quietQueryLog } from '#/test/quietQueryLog';
import { CannotSupply } from './moreActions';
import ActionAccordion from './FlowViewComponents/ActionAccordion';

const mockOkapi = makeOkapiKyMock();
const mockPerformAction = jest.fn();

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);
jest.mock('@folio/stripes-components/lib/TextArea', () => require('#/test/textAreaMock').default);
jest.mock('@folio/stripes/core', () => require('#/test/stripesCore').makeStripesCoreMock(() => mockOkapi));
jest.mock('@projectreshare/stripes-reshare', () => ({
  ...jest.requireActual('@projectreshare/stripes-reshare'),
  usePerformAction: () => mockPerformAction,
}));

const request = {
  id: 'pr-1',
  requesterRequestId: 'REQ-1',
  illRequest: { bibliographicInfo: { title: 'Test title' } },
};
const consortiumPath = 'directory/entries/by-id/consortium-1';
const reasons = [
  { code: 'CustomCode', defaultDesc: 'Consortium custom reason' },
  { code: 'NotHeld', defaultDesc: 'Consortium description for not held' },
];
const institution = {
  id: 'inst-1',
  type: 'Institution',
  parent: 'consortium-1',
  illConfig: { unfilledReasons: [{ code: 'Wrong', defaultDesc: 'Institution reason' }] },
};
const consortium = {
  id: 'consortium-1',
  type: 'Consortium',
  illConfig: {
    unfilledReasons: reasons,
    cancellationReasons: [{ code: 'Wrong', defaultDesc: 'Cancellation reason' }],
  },
};
const messages = {
  'ui-rs.actions.cannot-supply': 'Cannot Supply',
  'ui-rs.actions.cannot-supply.reason': 'Reason item cannot be supplied',
  'ui-rs.actions.cannot-supply.selectReason': 'Select a reason',
  'ui-rs.button.goBack': 'Go back',
};
const notifications = {
  success: 'ui-rs.actions.cannot-supply.success',
  error: 'ui-rs.actions.cannot-supply.error',
};

const renderCannotSupply = () => renderWithRs(
  <CannotSupply request={request} performAction={mockPerformAction} />,
  { messages }
);
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Cannot Supply' }));
const confirm = () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Cannot Supply' });
const ready = () => screen.findByRole('combobox');
const noteField = () => document.querySelector('textarea[name="note"]');
const setNote = value => fireEvent.change(noteField(), { target: { value } });
const setReason = value => fireEvent.change(screen.getByRole('combobox'), { target: { value } });

describe('CannotSupply', () => {
  quietQueryLog(/^Directory unavailable$/);

  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformAction.mockReset().mockResolvedValue({ outcome: 'success' });
    mockOkapi.setResponses({
      'directory/entries/owned': { items: [institution] },
      [consortiumPath]: consortium,
    });
  });

  it('loads only on opening and displays consortium unfilled reasons in configured order', async () => {
    renderCannotSupply();
    expect(mockOkapi).not.toHaveBeenCalled();
    open();
    const select = await ready();
    expect(Array.from(select.options, option => [option.value, option.text])).toEqual([
      ['', 'Select a reason'],
      ['CustomCode', 'Consortium custom reason'],
      ['NotHeld', 'Consortium description for not held'],
    ]);
    expect(select).toBeRequired();
    expect(select).toHaveValue('');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(mockPerformAction).not.toHaveBeenCalled();
  });

  it('requires a reason even when a note is entered and after the selection is cleared', async () => {
    renderCannotSupply();
    open();
    await ready();
    expect(confirm()).toBeDisabled();
    setNote('A note alone is insufficient');
    expect(confirm()).toBeDisabled();
    setReason('CustomCode');
    expect(confirm()).toBeEnabled();
    setReason('');
    expect(confirm()).toBeDisabled();
    await act(async () => fireEvent.submit(noteField().closest('form')));
    expect(mockPerformAction).not.toHaveBeenCalled();
  });

  it.each(['', '  Original\ncontent  '])('sends the code and separate optional note (%j)', async note => {
    renderCannotSupply();
    open();
    await ready();
    setReason('CustomCode');
    if (note) setNote(note);
    fireEvent.click(confirm());
    await waitFor(() => expect(mockPerformAction).toHaveBeenCalledWith(
      'cannot-supply',
      note ? { reasonUnfilled: 'CustomCode', note } : { reasonUnfilled: 'CustomCode' },
      notifications,
    ));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    open();
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(noteField()).toHaveValue('');
  });

  it.each(['Go back', 'stripes-components.dismissModal', 'Escape'])('discards inputs on dismissal via %s', async label => {
    renderCannotSupply();
    open();
    await ready();
    setReason('CustomCode');
    setNote('Discard me');
    if (label === 'Escape') fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    else fireEvent.click(screen.getByRole('button', { name: label }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockPerformAction).not.toHaveBeenCalled();
    open();
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(noteField()).toHaveValue('');
  });

  it.each([
    { illConfig: { unfilledReasons: [] } },
    { illConfig: {} },
    { illConfig: null },
    {},
  ])('blocks submission when no consortium reasons are configured (%j)', async entry => {
    mockOkapi.setResponses({ 'directory/entries/owned': { items: [institution] }, [consortiumPath]: entry });
    renderCannotSupply();
    open();
    await screen.findByText('ui-rs.actions.cannot-supply.noReasons');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(noteField()).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    await act(async () => fireEvent.submit(noteField().closest('form')));
    expect(mockPerformAction).not.toHaveBeenCalled();
  });

  it.each([{ items: [] }, { items: [{ ...institution, parent: null }] }])('blocks submission when the institution or parent is missing (%j)', async ({ items }) => {
    mockOkapi.setResponses({ 'directory/entries/owned': { items } });
    renderCannotSupply();
    open();
    await screen.findByText('ui-rs.actions.cannot-supply.noReasons');
    expect(mockOkapi.calledUrls()).toHaveLength(1);
    expect(confirm()).toBeDisabled();
  });

  it.each(['directory/entries/owned', consortiumPath])('blocks submission and displays lookup failures at %s', async path => {
    mockOkapi.setResponses({
      'directory/entries/owned': { items: [institution] },
      [consortiumPath]: consortium,
      [path]: () => { throw new Error('Directory unavailable'); },
    });
    renderCannotSupply();
    open();
    await screen.findByText('ui-rs.actions.cannot-supply.reasonsError');
    expect(confirm()).toBeDisabled();
    expect(mockPerformAction).not.toHaveBeenCalled();
  });

  it('blocks submission until both directory lookups finish', async () => {
    let resolveOwned;
    let resolveConsortium;
    mockOkapi.setResponses({
      'directory/entries/owned': () => new Promise(resolve => { resolveOwned = resolve; }),
      [consortiumPath]: () => new Promise(resolve => { resolveConsortium = resolve; }),
    });
    renderCannotSupply();
    open();
    expect(confirm()).toBeDisabled();
    expect(screen.queryByText('ui-rs.actions.cannot-supply.noReasons')).not.toBeInTheDocument();
    await act(async () => resolveOwned({ items: [institution] }));
    await waitFor(() => expect(resolveConsortium).toBeDefined());
    expect(confirm()).toBeDisabled();
    await act(async () => resolveConsortium(consortium));
    await ready();
    setReason('CustomCode');
    expect(confirm()).toBeEnabled();
  });

  it.each([[], [reasons[1]]].map(remaining => ({ remaining })))('clears a removed reason and blocks submission after a refresh (%j)', async ({ remaining }) => {
    const { queryClient } = renderCannotSupply();
    open();
    await ready();
    setReason('CustomCode');
    setNote('Keep this note');
    await act(async () => {
      queryClient.setQueryData([consortiumPath], { ...consortium, illConfig: { unfilledReasons: remaining } });
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(confirm()).toBeDisabled();
    await act(async () => {
      queryClient.setQueryData([consortiumPath], consortium);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(noteField()).toHaveValue('Keep this note');
    expect(confirm()).toBeDisabled();
  });

  it('preserves a selection that remains configured after a refresh', async () => {
    const { queryClient } = renderCannotSupply();
    open();
    await ready();
    setReason('CustomCode');
    await act(async () => {
      queryClient.setQueryData([consortiumPath], { ...consortium, illConfig: { unfilledReasons: [reasons[0]] } });
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(screen.getByRole('combobox')).toHaveValue('CustomCode');
    expect(confirm()).toBeEnabled();
  });

  it('prevents duplicate submission and dismissal while sending, and retains inputs for retry after failure', async () => {
    let rejectAction;
    mockPerformAction.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectAction = reject; }));
    renderCannotSupply();
    open();
    await ready();
    setReason('CustomCode');
    setNote('Retain me');
    fireEvent.click(confirm());
    expect(confirm()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(noteField()).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(confirm());
    await act(async () => fireEvent.submit(noteField().closest('form')));
    expect(mockPerformAction).toHaveBeenCalledTimes(1);
    await act(async () => rejectAction(new Error('Action failed')));
    await waitFor(() => expect(confirm()).toBeEnabled());
    expect(screen.getByRole('combobox')).toHaveValue('CustomCode');
    expect(noteField()).toHaveValue('Retain me');
    fireEvent.click(confirm());
    await waitFor(() => expect(mockPerformAction).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('blocks confirmation when the request is invalidated', async () => {
    const { queryClient } = renderCannotSupply();
    open();
    await ready();
    setReason('CustomCode');
    await act(async () => {
      queryClient.setQueryData(`broker/patron_requests/${request.id}`, request);
      queryClient.invalidateQueries(`broker/patron_requests/${request.id}`, { refetchActive: false });
    });
    expect(confirm()).toBeDisabled();
    await act(async () => fireEvent.submit(noteField().closest('form')));
    expect(mockPerformAction).not.toHaveBeenCalled();
  });

  it('uses the modal through the action registry', async () => {
    renderWithRs(
      <ActionAccordion request={request} actions={[{ name: 'cannot-supply', parameters: ['reasonUnfilled', 'note'] }]} />,
      { messages }
    );
    open();
    await ready();
    setReason('NotHeld');
    fireEvent.click(confirm());
    await waitFor(() => expect(mockPerformAction).toHaveBeenCalledWith(
      'cannot-supply', { reasonUnfilled: 'NotHeld' }, notifications,
    ));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
