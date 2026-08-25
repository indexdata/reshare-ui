import React from 'react';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../../../test/renderWithRs';
import AddItem from './AddItem';

jest.mock('@folio/stripes-components/lib/Icon', () => require('../../../test/iconMock').default);

jest.mock('@projectreshare/stripes-reshare', () => ({
  ...jest.requireActual('@projectreshare/stripes-reshare'),
  useIsActionPending: () => false,
}));

const request = { id: 'pr-1' };

const actionButtons = () => screen.getAllByText('stripes-reshare.actions.add-item')
  .map(el => el.closest('button'))
  .filter(Boolean);

describe('secondary AddItem action', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires a barcode and submits the trimmed optional fields alongside it', async () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderWithRs(<AddItem request={request} performAction={performAction} />);

    fireEvent.click(actionButtons()[0]);
    const submit = actionButtons().slice(-1)[0];
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/ui-rs.flow.volumes.itemBarcode/), { target: { value: '  30001000123456  ' } });
    fireEvent.change(screen.getByLabelText(/ui-rs.flow.volumes.callNumber/), { target: { value: ' PN1993.5 ' } });
    fireEvent.change(screen.getByLabelText(/ui-rs.flow.volumes.title/), { target: { value: 'Volume 2' } });
    fireEvent.click(submit);

    await waitFor(() => expect(performAction).toHaveBeenCalledWith(
      'add-item',
      {
        barcode: '30001000123456',
        callNumber: 'PN1993.5',
        title: 'Volume 2',
      },
    ));
    await waitFor(() => expect(actionButtons()).toHaveLength(1));
  });

  it('omits blank optional fields', async () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderWithRs(<AddItem request={request} performAction={performAction} />);

    fireEvent.click(actionButtons()[0]);
    fireEvent.change(screen.getByLabelText(/ui-rs.flow.volumes.itemBarcode/), { target: { value: '30001000123456' } });
    fireEvent.change(screen.getByLabelText(/ui-rs.flow.volumes.callNumber/), { target: { value: '   ' } });
    fireEvent.click(actionButtons().slice(-1)[0]);

    await waitFor(() => expect(performAction).toHaveBeenCalledWith(
      'add-item',
      { barcode: '30001000123456' },
    ));
  });

  it('keeps the modal open when the action fails', async () => {
    const performAction = jest.fn(() => Promise.reject(new Error('barcode is already attached')));
    renderWithRs(<AddItem request={request} performAction={performAction} />);

    fireEvent.click(actionButtons()[0]);
    fireEvent.change(screen.getByLabelText(/ui-rs.flow.volumes.itemBarcode/), { target: { value: '30001000123456' } });
    fireEvent.click(actionButtons().slice(-1)[0]);

    await waitFor(() => expect(performAction).toHaveBeenCalled());
    // Modal still open: its submit button is the second one bearing the action label.
    expect(actionButtons()).toHaveLength(2);
  });
});
