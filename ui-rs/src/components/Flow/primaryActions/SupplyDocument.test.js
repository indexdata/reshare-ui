import React from 'react';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../../../test/renderWithRs';
import SupplyDocument from './SupplyDocument';

const mockSendCallout = jest.fn();

jest.mock('@folio/stripes-components/lib/Icon', () => require('../../../test/iconMock').default);

jest.mock('@folio/stripes/components', () => {
  const r = require('react');
  return {
    ...jest.requireActual('@folio/stripes/components'),
    TextArea: r.forwardRef(({ input, meta: _meta, ...rest }, ref) => (
      r.createElement('textarea', { ref, ...input, ...rest })
    )),
  };
});

jest.mock('@projectreshare/stripes-reshare', () => ({
  ...jest.requireActual('@projectreshare/stripes-reshare'),
  useIntlCallout: () => mockSendCallout,
  useIsActionPending: () => false,
}));

const request = {
  id: 'pr-1',
  requesterRequestId: 'REQ-1',
};

const renderSupplyDocument = performAction => renderWithRs(
  <SupplyDocument request={request} performAction={performAction} />
);

describe('SupplyDocument', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires a delivery URL', () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderSupplyDocument(performAction);

    const submit = screen.getByText('ui-rs.button.scan').closest('button');
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(performAction).not.toHaveBeenCalled();
  });

  it('submits the trimmed delivery URL and note', async () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderSupplyDocument(performAction);

    fireEvent.change(screen.getByLabelText(/ui-rs.actions.supply-document.deliveryUrl/), {
      target: { value: '  https://documents.example.org/copy/1  ' },
    });
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs.find(input => input.getAttribute('name') === 'reqId'), {
      target: { value: 'req-1' },
    });
    fireEvent.change(inputs.find(input => input.getAttribute('name') === 'note'), {
      target: { value: 'Document ready' },
    });
    fireEvent.click(screen.getByText('ui-rs.button.scan').closest('button'));

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

  it('rejects a scan for another request', async () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderSupplyDocument(performAction);

    fireEvent.change(screen.getByLabelText(/ui-rs.actions.supply-document.deliveryUrl/), {
      target: { value: 'https://documents.example.org/copy/1' },
    });
    const reqId = screen.getAllByRole('textbox').find(input => input.getAttribute('name') === 'reqId');
    fireEvent.change(reqId, { target: { value: 'REQ-2' } });
    fireEvent.click(screen.getByText('ui-rs.button.scan').closest('button'));

    await waitFor(() => expect(mockSendCallout).toHaveBeenCalledWith('ui-rs.actions.wrongId', 'error'));
    expect(performAction).not.toHaveBeenCalled();
  });
});
