import React from 'react';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../../../test/renderWithRs';
import SupplyDocument from './SupplyDocument';

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
  useIsActionPending: () => false,
}));

const request = { id: 'pr-1' };

const actionButtons = () => screen.getAllByText('stripes-reshare.actions.supply-document')
  .map(el => el.closest('button'))
  .filter(Boolean);

describe('secondary SupplyDocument action', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires a URL and submits the trimmed URL and note', async () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderWithRs(<SupplyDocument request={request} performAction={performAction} />);

    fireEvent.click(actionButtons()[0]);
    const submit = actionButtons().slice(-1)[0];
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/ui-rs.actions.supply-document.deliveryUrl/), {
      target: { value: '  https://documents.example.org/copy/2  ' },
    });
    const note = screen.getAllByRole('textbox').find(input => input.getAttribute('name') === 'note');
    fireEvent.change(note, { target: { value: 'Document ready' } });
    fireEvent.click(submit);

    await waitFor(() => expect(performAction).toHaveBeenCalledWith(
      'supply-document',
      {
        deliveryUrl: 'https://documents.example.org/copy/2',
        note: 'Document ready',
      },
      {
        success: 'ui-rs.actions.supply-document.success',
        error: 'ui-rs.actions.supply-document.error',
      },
    ));
    await waitFor(() => expect(actionButtons()).toHaveLength(1));
  });
});
