import React from 'react';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import SupplyDocument from './SupplyDocument';

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);

jest.mock('@projectreshare/stripes-reshare', () => ({
  ...jest.requireActual('@projectreshare/stripes-reshare'),
  useIsActionPending: () => false,
}));

const request = {
  id: 'pr-1',
  requesterRequestId: 'REQ-1',
};

const renderSupplyDocument = (performAction, withNote = false) => renderWithRs(
  <SupplyDocument request={request} performAction={performAction} withNote={withNote} />
);

describe('SupplyDocument', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires a delivery URL', () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderSupplyDocument(performAction);

    const submit = screen.getByText('stripes-reshare.actions.supply-document').closest('button');
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(performAction).not.toHaveBeenCalled();
  });

  it('submits the trimmed delivery URL and an optional disclosed note without requiring a request ID scan', async () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderSupplyDocument(performAction, true);

    expect(screen.queryByText('ui-rs.button.scan')).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getByText('ui-rs.actions.addNote')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('ui-rs.actions.supply-document.deliveryUrl'), {
      target: { value: '  https://documents.example.org/copy/1  ' },
    });
    fireEvent.click(screen.getByText('ui-rs.actions.addNote').closest('button'));
    expect(screen.getByText('ui-rs.actions.hideNoteField')).toBeInTheDocument();

    const note = screen.getAllByRole('textbox').find(input => input.getAttribute('name') === 'note');
    fireEvent.change(note, { target: { value: 'Document ready' } });
    fireEvent.click(screen.getByText('stripes-reshare.actions.supply-document').closest('button'));

    await waitFor(() => expect(performAction).toHaveBeenCalledWith(
      'supply-document',
      {
        deliveryUrl: 'https://documents.example.org/copy/1',
        note: 'Document ready',
      },
      {
        success: 'ui-rs.actions.supply-document.success',
        error: 'ui-rs.actions.supply-document.error',
      },
    ));
  });

  it('does not show or submit a note when it is not an action parameter', async () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderSupplyDocument(performAction);

    expect(screen.queryByText('ui-rs.actions.addNote')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('ui-rs.actions.supply-document.deliveryUrl'), {
      target: { value: 'https://documents.example.org/copy/1' },
    });
    fireEvent.click(screen.getByText('stripes-reshare.actions.supply-document').closest('button'));

    await waitFor(() => expect(performAction).toHaveBeenCalledWith(
      'supply-document',
      { deliveryUrl: 'https://documents.example.org/copy/1' },
      {
        success: 'ui-rs.actions.supply-document.success',
        error: 'ui-rs.actions.supply-document.error',
      },
    ));
  });
});
