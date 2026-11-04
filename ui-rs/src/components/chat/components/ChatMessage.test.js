import React from 'react';
import { screen } from '@folio/jest-config-stripes/testing-library/react';
import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import ChatMessage from './ChatMessage';

const messages = {
  'ui-rs.view.chatMessage.conditionSummary': 'Condition: {code}',
  'ui-rs.view.chatMessage.cancellationReasonSummary': 'Cancellation reason: {code}',
  'ui-rs.view.chatMessage.unfilledReasonSummary': 'Unfilled reason: {code}',
};

const renderMessage = (notification) => renderWithRs(
  <ChatMessage notification={{ id: 'n1', isSender: true, messageContent: 'body', ...notification }} />,
  { messages }
);

describe('ChatMessage code summary', () => {
  it('summarises a condition with its cost', () => {
    renderMessage({ kind: 'condition', code: 'RareBkRoom', codeDescription: 'Rare book room only', cost: 5, currency: 'USD' });
    expect(screen.getByText('Condition: Rare book room only · 5 USD')).toBeInTheDocument();
  });

  it('summarises a cost-only condition by its cost', () => {
    renderMessage({ kind: 'condition', cost: 5, currency: 'USD' });
    expect(screen.getByText('Condition: 5 USD')).toBeInTheDocument();
  });

  it('labels cancellation and unfilled reasons by kind', () => {
    renderMessage({ kind: 'cancellation_reason', code: 'LocalCode', codeDescription: 'Library-defined reason' });
    expect(screen.getByText('Cancellation reason: Library-defined reason')).toBeInTheDocument();
  });

  it('falls back to the code when the sender gave no description', () => {
    renderMessage({ kind: 'unfilled_reason', code: 'NotOnShelf', cost: 5 });
    expect(screen.getByText('Unfilled reason: NotOnShelf')).toBeInTheDocument();
  });

  it('adds no summary to plain notes', () => {
    renderMessage({ kind: 'note', code: 'ignored' });
    expect(screen.queryByText(/ignored/)).toBeNull();
  });
});
