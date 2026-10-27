import React from 'react';
import { act, fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';
import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import { quietQueryLog } from '#/test/quietQueryLog';
import CancelRequest from './CancelRequest';
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

const request = { id: 'pr-1', requesterRequestId: 'REQ-1' };
const consortiumPath = 'directory/entries/by-id/consortium-1';
const reasons = [
  { code: 'UserRequest', defaultDesc: 'User requested cancellation' },
  { code: 'DuplicateRequest', defaultDesc: 'Duplicate request' },
];
const institution = {
  id: 'inst-1',
  type: 'Institution',
  parent: 'consortium-1',
  illConfig: { cancellationReasons: [{ code: 'Wrong', defaultDesc: 'Institution reason' }] },
};
const consortium = { id: 'consortium-1', type: 'Consortium', illConfig: { cancellationReasons: reasons } };
const messages = {
  'stripes-reshare.actions.cancel-request': 'Cancel request',
  'ui-rs.actions.cancel-request.confirmButton': 'Confirm',
  'ui-rs.actions.cancel-request.reason': 'Cancellation reason',
  'ui-rs.actions.cancel-request.noReason': 'No reason specified',
  'stripes-components.cancel': 'Cancel',
};

const renderCancellation = () => renderWithRs(
  <CancelRequest request={request} performAction={mockPerformAction} />,
  { messages }
);
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }));
const confirm = () => screen.getByRole('button', { name: 'Confirm' });
const ready = () => waitFor(() => expect(confirm()).toBeEnabled());
const noteField = () => document.querySelector('textarea[name="note"]');
const setNote = value => fireEvent.change(noteField(), { target: { value } });
const setReason = value => fireEvent.change(screen.getByRole('combobox'), { target: { value } });

describe('CancelRequest', () => {
  quietQueryLog(/^Directory unavailable$/);

  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformAction.mockReset().mockResolvedValue({ outcome: 'success' });
    mockOkapi.setResponses({
      'directory/entries/owned': { items: [institution] },
      [consortiumPath]: consortium,
    });
  });

  it('loads consortium reasons only when opened and does not send until confirmed', async () => {
    renderCancellation();
    expect(mockOkapi).not.toHaveBeenCalled();
    expect(screen.queryByText('ui-rs.actions.addNote')).not.toBeInTheDocument();
    open();
    await ready();
    expect(mockPerformAction).not.toHaveBeenCalled();
    expect(Array.from(screen.getByRole('combobox').options, option => [option.value, option.text])).toEqual([
      ['', 'No reason specified'],
      ['UserRequest', 'User requested cancellation'],
      ['DuplicateRequest', 'Duplicate request'],
    ]);
    expect(screen.queryByText('Institution reason')).not.toBeInTheDocument();
    expect(noteField()).toBeInTheDocument();
  });

  it.each([
    ['', '', {}],
    ['', 'Additional note', { note: 'Additional note' }],
    ['UserRequest', '', { note: '#CancellationReason: UserRequest#' }],
    ['DuplicateRequest', 'Additional note', { note: '#CancellationReason: DuplicateRequest# Additional note' }],
    ['UserRequest', '  Original\ncontent  ', { note: '#CancellationReason: UserRequest#   Original\ncontent  ' }],
  ])('sends the expected payload for reason %s and note %s', async (reason, note, payload) => {
    renderCancellation();
    open();
    await ready();
    if (reason) setReason(reason);
    if (note) setNote(note);
    fireEvent.click(confirm());
    await waitFor(() => expect(mockPerformAction).toHaveBeenCalledWith('cancel-request', payload));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    open();
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(noteField()).toHaveValue('');
  });

  it('does not include a reason that was cleared', async () => {
    renderCancellation();
    open();
    await ready();
    setReason('UserRequest');
    setReason('');
    setNote('Just a note');
    fireEvent.click(confirm());
    await waitFor(() => expect(mockPerformAction).toHaveBeenCalledWith('cancel-request', { note: 'Just a note' }));
  });

  it.each(['Cancel', 'stripes-components.dismissModal'])('dismisses via %s without sending and resets the form', async label => {
    renderCancellation();
    open();
    await ready();
    setReason('UserRequest');
    setNote('Discard me');
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(mockPerformAction).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    open();
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(noteField()).toHaveValue('');
  });

  it.each([
    { ...consortium, illConfig: { cancellationReasons: [] } },
    { ...consortium, illConfig: {} },
    { ...consortium, illConfig: null },
  ])('hides the dropdown when no reasons are configured (%j)', async entry => {
    mockOkapi.setResponses({ 'directory/entries/owned': { items: [institution] }, [consortiumPath]: entry });
    renderCancellation();
    open();
    await ready();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(noteField()).toBeInTheDocument();
    fireEvent.click(confirm());
    await waitFor(() => expect(mockPerformAction).toHaveBeenCalledWith('cancel-request', {}));
  });

  it.each([{ items: [] }, { items: [{ ...institution, parent: null }] }])('allows cancellation when institution or parent is missing (%j)', async ({ items }) => {
    mockOkapi.setResponses({ 'directory/entries/owned': { items } });
    renderCancellation();
    open();
    await ready();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(mockOkapi.calledUrls()).toHaveLength(1);
  });

  it.each(['directory/entries/owned', consortiumPath])('allows cancellation after lookup failure at %s', async path => {
    mockOkapi.setResponses({
      'directory/entries/owned': { items: [institution] },
      [consortiumPath]: consortium,
      [path]: () => { throw new Error('Directory unavailable'); },
    });
    renderCancellation();
    open();
    await ready();
    expect(screen.getByText('ui-rs.actions.cancel-request.reasonsError')).toBeInTheDocument();
    setNote('Without reason');
    fireEvent.click(confirm());
    await waitFor(() => expect(mockPerformAction).toHaveBeenCalledWith('cancel-request', { note: 'Without reason' }));
  });

  it('disables confirmation until both directory lookups finish', async () => {
    let resolveOwned;
    let resolveConsortium;
    mockOkapi.setResponses({
      'directory/entries/owned': () => new Promise(resolve => { resolveOwned = resolve; }),
      [consortiumPath]: () => new Promise(resolve => { resolveConsortium = resolve; }),
    });
    renderCancellation();
    open();
    expect(confirm()).toBeDisabled();
    await act(async () => resolveOwned({ items: [institution] }));
    await waitFor(() => expect(resolveConsortium).toBeDefined());
    expect(confirm()).toBeDisabled();
    await act(async () => resolveConsortium(consortium));
    await ready();
  });

  it('reuses fresh cached directory data without retrieving it again', async () => {
    const { queryClient } = renderCancellation();
    await act(async () => {
      queryClient.setQueryData(['directory/entries/owned', { limit: '1000' }], { items: [institution] });
      queryClient.setQueryData([consortiumPath], consortium);
      // React Query schedules notifications to the mounted, disabled observers.
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    open();
    expect(confirm()).toBeEnabled();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(mockOkapi).not.toHaveBeenCalled();
  });

  it('displays stale cached reasons while refreshing them in the background', async () => {
    let resolveConsortium;
    mockOkapi.setResponses({
      [consortiumPath]: () => new Promise(resolve => { resolveConsortium = resolve; }),
    });
    const { queryClient } = renderCancellation();
    await act(async () => {
      queryClient.setQueryData(['directory/entries/owned', { limit: '1000' }], { items: [institution] });
      queryClient.setQueryData([consortiumPath], consortium, { updatedAt: Date.now() - 3 * 60 * 1000 });
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    open();
    expect(confirm()).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Duplicate request' })).toBeInTheDocument();
    expect(mockOkapi.calledUrls()).toEqual([consortiumPath]);
    await act(async () => resolveConsortium({ ...consortium, illConfig: { cancellationReasons: reasons.slice(0, 1) } }));
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Duplicate request' })).not.toBeInTheDocument());
  });

  it('retains the form after failure and permits retry', async () => {
    mockPerformAction.mockRejectedValueOnce(new Error('Action failed'));
    renderCancellation();
    open();
    await ready();
    setReason('UserRequest');
    setNote('Retain me');
    fireEvent.click(confirm());
    await waitFor(() => expect(mockPerformAction).toHaveBeenCalledTimes(1));
    await ready();
    expect(screen.getByRole('combobox')).toHaveValue('UserRequest');
    expect(noteField()).toHaveValue('Retain me');
    fireEvent.click(confirm());
    await waitFor(() => expect(mockPerformAction).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it.each([[], [reasons[0]]].map(remaining => ({ remaining })))('clears a reason removed by a directory refresh (%j)', async ({ remaining }) => {
    const { queryClient } = renderCancellation();
    open();
    await ready();
    setReason('DuplicateRequest');
    setNote('Keep this note');
    await act(async () => {
      queryClient.setQueryData([consortiumPath], { ...consortium, illConfig: { cancellationReasons: remaining } });
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    if (remaining.length) expect(screen.getByRole('combobox')).toHaveValue('');
    else expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    // Restoring the old list must not restore a selection the user can no longer see.
    await act(async () => {
      queryClient.setQueryData([consortiumPath], consortium);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(noteField()).toHaveValue('Keep this note');
    fireEvent.click(confirm());
    await waitFor(() => expect(mockPerformAction).toHaveBeenCalledWith('cancel-request', { note: 'Keep this note' }));
  });

  it('preserves a selected reason that is still configured after a refresh', async () => {
    const { queryClient } = renderCancellation();
    open();
    await ready();
    setReason('UserRequest');
    await act(async () => {
      queryClient.setQueryData([consortiumPath], { ...consortium, illConfig: { cancellationReasons: [reasons[0]] } });
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(screen.getByRole('combobox')).toHaveValue('UserRequest');
    fireEvent.click(confirm());
    await waitFor(() => expect(mockPerformAction).toHaveBeenCalledWith('cancel-request', { note: '#CancellationReason: UserRequest#' }));
  });

  it('prevents duplicate submission and dismissal while sending', async () => {
    let resolveAction;
    mockPerformAction.mockImplementationOnce(() => new Promise(resolve => { resolveAction = resolve; }));
    renderCancellation();
    open();
    await ready();
    fireEvent.click(confirm());
    expect(confirm()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(confirm());
    expect(mockPerformAction).toHaveBeenCalledTimes(1);
    await act(async () => resolveAction());
  });

  it('keeps inputs when Escape is pressed while sending and permits dismissal after failure', async () => {
    let rejectAction;
    mockPerformAction.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectAction = reject; }));
    renderCancellation();
    open();
    await ready();
    setReason('UserRequest');
    setNote('Keep this note');
    fireEvent.click(confirm());
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await act(async () => rejectAction(new Error('Action failed')));
    await ready();
    expect(screen.getByRole('combobox')).toHaveValue('UserRequest');
    expect(noteField()).toHaveValue('Keep this note');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockPerformAction).toHaveBeenCalledTimes(1);
  });

  it('withdraws confirmation when the request is invalidated', async () => {
    const { queryClient } = renderCancellation();
    open();
    await ready();
    await act(async () => {
      queryClient.setQueryData(`broker/patron_requests/${request.id}`, request);
      queryClient.invalidateQueries(`broker/patron_requests/${request.id}`, { refetchActive: false });
    });
    expect(confirm()).toBeDisabled();
  });

  it.each([false, true])('uses the modal through the action registry (primary=%s)', async primary => {
    renderWithRs(
      <ActionAccordion request={request} actions={[{ name: 'cancel-request', primary, parameters: ['note'] }]} />,
      { messages }
    );
    const openers = screen.getAllByRole('button', { name: 'Cancel request' });
    expect(openers).toHaveLength(primary ? 2 : 1);
    expect(screen.queryByText('ui-rs.actions.addNote')).not.toBeInTheDocument();
    fireEvent.click(openers[0]);
    await ready();
    expect(mockPerformAction).not.toHaveBeenCalled();
  });
});
