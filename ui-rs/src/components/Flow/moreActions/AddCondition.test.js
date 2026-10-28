import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@folio/jest-config-stripes/testing-library/react';
import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import { quietQueryLog } from '#/test/quietQueryLog';
import AddCondition from './AddCondition';

const mockOkapi = makeOkapiKyMock();
jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);
jest.mock('@folio/stripes-components/lib/TextArea', () => require('#/test/textAreaMock').default);
jest.mock('@folio/stripes/core', () => require('#/test/stripesCore').makeStripesCoreMock(() => mockOkapi));

const conditions = [
  { code: 'Custom', defaultDesc: 'Directory custom condition' },
  { code: 'LibraryUseOnly', defaultDesc: 'Directory library description' },
];
const institution = { id: 'inst-1', type: 'Institution', illConfig: { loanConditions: conditions } };
const request = {
  id: 'pr-1',
  illRequest: { bibliographicInfo: { title: 'Title' }, billingInfo: { maximumCosts: { monetaryValue: 10 } } },
};
const actionLabel = 'stripes-reshare.actions.add-condition';
const performAction = jest.fn();
const open = () => fireEvent.click(screen.getByRole('button', { name: actionLabel }));
const confirm = () => within(screen.getByRole('dialog')).getByRole('button', { name: actionLabel });
const note = () => document.querySelector('textarea[name="note"]');
const renderModal = () => renderWithRs(<AddCondition request={request} performAction={performAction} />);

describe('AddCondition Directory conditions', () => {
  quietQueryLog(/^Directory unavailable$/);

  beforeEach(() => {
    jest.clearAllMocks();
    performAction.mockReset().mockResolvedValue({});
    mockOkapi.setResponses({ 'directory/entries/owned': { items: [institution] } });
  });

  it('loads on opening, displays Directory descriptions in order and submits the selected code', async () => {
    renderModal();
    expect(mockOkapi).not.toHaveBeenCalled();
    open();
    await screen.findByRole('radio', { name: conditions[0].defaultDesc });
    expect(screen.getAllByRole('radio').map(radio => radio.value)).toEqual(['Custom', 'LibraryUseOnly']);
    fireEvent.click(screen.getByRole('radio', { name: conditions[0].defaultDesc }));
    fireEvent.change(note(), { target: { value: 'A note' } });
    fireEvent.click(confirm());
    await waitFor(() => expect(performAction).toHaveBeenCalledWith(
      'add-condition', { loanCondition: 'Custom', note: 'A note' }, expect.anything()
    ));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it.each([
    { ...institution, illConfig: { loanConditions: [] } },
    { ...institution, illConfig: {} },
    { ...institution, illConfig: null },
    null,
  ])('shows an empty message and preserves cost-only submission (%j)', async entry => {
    mockOkapi.setResponses({ 'directory/entries/owned': { items: entry ? [entry] : [] } });
    renderModal();
    open();
    await screen.findByText('ui-rs.actions.add-condition.noConditions');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    fireEvent.change(note(), { target: { value: 'Note alone' } });
    expect(confirm()).toBeDisabled();
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2.50' } });
    fireEvent.click(confirm());
    await waitFor(() => expect(performAction).toHaveBeenCalledWith(
      'add-condition',
      { loanCondition: undefined, note: 'Note alone', cost: 2.5, currency: 'USD' },
      expect.anything()
    ));
  });

  it('blocks submission while loading and reports lookup failure separately from an empty list', async () => {
    let rejectLookup;
    mockOkapi.setResponses({
      'directory/entries/owned': () => new Promise((resolve, reject) => { rejectLookup = reject; }),
    });
    renderModal();
    open();
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    expect(confirm()).toBeDisabled();
    expect(screen.queryByText('ui-rs.actions.add-condition.noConditions')).not.toBeInTheDocument();
    await act(async () => rejectLookup(new Error('Directory unavailable')));
    await screen.findByText('ui-rs.actions.add-condition.conditionsError');
    expect(confirm()).toBeDisabled();
    await act(async () => fireEvent.submit(note().closest('form')));
    expect(performAction).not.toHaveBeenCalled();
  });

  it('does not submit a condition removed by a Directory refresh', async () => {
    const { queryClient } = renderModal();
    open();
    fireEvent.click(await screen.findByRole('radio', { name: conditions[0].defaultDesc }));
    expect(confirm()).toBeEnabled();
    await act(async () => {
      queryClient.setQueryData(['directory/entries/owned', { limit: '1000' }], {
        items: [{ ...institution, illConfig: { loanConditions: [conditions[1]] } }],
      });
    });
    expect(confirm()).toBeDisabled();
    await act(async () => fireEvent.submit(note().closest('form')));
    expect(performAction).not.toHaveBeenCalled();
  });
});
