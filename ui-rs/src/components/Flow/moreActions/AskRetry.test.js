import React from 'react';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../../../test/renderWithRs';
import AskRetry from './AskRetry';

jest.mock('@folio/stripes-components/lib/Icon', () => require('../../../test/iconMock').default);

// Stub the TextArea leaf: under jsdom the real one measures layout and adds
// noise; a plain textarea keeps the note field driveable via fireEvent.change.
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

const request = {
  id: 'pr-1',
  requesterRequestId: 'rrid-1',
  illRequest: { bibliographicInfo: { title: 'Test Title' } },
};

const renderAskRetry = (performAction) => renderWithRs(
  <AskRetry request={request} performAction={performAction} />
);

// Both the dropdown opener and the modal footer submit carry the action label.
// Only these are <button>s (the modal heading is not), so after filtering the
// opener is first and the submit is last.
const actionButtons = () => screen.getAllByText('ui-rs.actions.ask-retry')
  .map(el => el.closest('button'))
  .filter(Boolean);

const openModal = () => fireEvent.click(actionButtons()[0]);
const submitButton = () => actionButtons().slice(-1)[0];

describe('AskRetry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires the new system identifier before submitting', () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderAskRetry(performAction);
    openModal();

    // Reason is pre-selected (only NotFoundAsCited is supported) but itemId is
    // empty, so the primary button is disabled and no action fires.
    const submit = submitButton();
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(performAction).not.toHaveBeenCalled();
  });

  it('sends ask-retry with reasonRetry and itemId, and closes the modal', async () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderAskRetry(performAction);
    openModal();

    fireEvent.change(screen.getByLabelText(/ui-rs.actions.ask-retry.itemId/), {
      target: { value: 'new-instance-99' },
    });

    const submit = submitButton();
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);

    await waitFor(() => expect(performAction).toHaveBeenCalledTimes(1));
    expect(performAction).toHaveBeenCalledWith(
      'ask-retry',
      { reasonRetry: 'NotFoundAsCited', itemId: 'new-instance-99', note: undefined },
      {
        success: 'ui-rs.actions.ask-retry.success',
        error: 'ui-rs.actions.ask-retry.error',
      },
    );
    // The submit resolves and the modal closes, leaving only the dropdown opener.
    await waitFor(() => expect(actionButtons()).toHaveLength(1));
  });

  it('trims surrounding whitespace from the pasted identifier before submitting', async () => {
    const performAction = jest.fn(() => Promise.resolve());
    renderAskRetry(performAction);
    openModal();

    fireEvent.change(screen.getByLabelText(/ui-rs.actions.ask-retry.itemId/), {
      target: { value: '  0201896834 ' },
    });

    fireEvent.click(submitButton());

    await waitFor(() => expect(performAction).toHaveBeenCalledTimes(1));
    expect(performAction).toHaveBeenCalledWith(
      'ask-retry',
      { reasonRetry: 'NotFoundAsCited', itemId: '0201896834', note: undefined },
      expect.anything(),
    );
  });
});
