import React from 'react';
import { act, screen } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import ActionButton from './ActionButton';

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);

const request = { id: 'pr-1', requesterRequestId: 'pr-1' };
const RECORD_KEY = `broker/patron_requests/${request.id}`;

const renderActionButton = () => {
  const rendered = renderWithRs(
    <ActionButton
      action="ask-retry"
      label="ui-rs.actions.ask-retry"
      request={request}
      performAction={jest.fn()}
    />
  );
  rendered.queryClient.setQueryData(RECORD_KEY, request);
  return rendered;
};

const button = () => screen.getByText('ui-rs.actions.ask-retry').closest('button');

describe('ActionButton', () => {
  it('offers the action while the request is up to date', () => {
    renderActionButton();

    expect(button()).toBeEnabled();
  });

  // Generic secondary actions have no form of their own, so this is the only
  // thing withdrawing them once a peer message says the request has moved on.
  it('withdraws the action while the request is out of date', async () => {
    const { queryClient } = renderActionButton();

    await act(async () => {
      queryClient.invalidateQueries(RECORD_KEY, { refetchActive: false });
    });

    expect(button()).toBeDisabled();
  });
});
