import React from 'react';
import { fireEvent, screen } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import EventLog from './EventLog';

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);

// Jest cannot parse react-syntax-highlighter's ESM entry points.
jest.mock('react-syntax-highlighter', () => ({
  LightAsync: ({ children }) => require('react').createElement('pre', null, children),
}));
jest.mock('react-syntax-highlighter/dist/esm/styles/hljs', () => ({ github: { hljs: {} } }));

const renderLog = (events) => renderWithRs(
  <EventLog events={events} header="header" cardId="card" />,
  { messages: { 'ui-rs.eventLog.matchCount': '{count} of {total}' } }
);

const makeEvent = (over) => ({
  id: 'ev-1',
  timestamp: '2026-01-05T12:00:00Z',
  eventName: 'invoke-action',
  eventType: 'TASK',
  eventStatus: 'SUCCESS',
  eventData: {},
  resultData: {},
  ...over,
});

const events = [
  makeEvent({ id: 'ev-1', eventData: { action: 'Request', user: 'jsmith' } }),
  makeEvent({
    id: 'ev-2',
    eventData: { action: 'Cancel', user: 'jsmith', customData: { trace: 'raw-only-value' } },
  }),
  makeEvent({ id: 'ev-3', eventName: 'message-supplier', eventData: { user: 'apatel' } }),
];

const rows = () => screen.getAllByRole('button').filter((b) => b.className === 'entryHeader');
const filterBox = () => screen.getByRole('searchbox');

describe('EventLog', () => {
  it('reads action, actor and message payloads off the event', () => {
    renderLog([makeEvent({
      eventData: { action: 'Request', user: 'jsmith', outgoingMessage: { request: {} } },
    })]);

    expect(screen.getByText(/ui-rs\.eventHistory\.event\.invokeAction: Request/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /invokeAction/ }));

    expect(screen.getByText('jsmith')).toBeInTheDocument();
    expect(screen.getByText('Request')).toBeInTheDocument();
    expect(screen.getByText('ui-rs.eventHistory.isoOutgoing')).toBeInTheDocument();
  });

  it('filters as you type on raw event JSON, counts matches, and restores on clear', () => {
    renderLog(events);
    expect(rows()).toHaveLength(3);
    expect(screen.queryByText('3 of 3')).not.toBeInTheDocument();

    fireEvent.focus(filterBox());
    fireEvent.change(filterBox(), { target: { value: 'raw-only-value' } });
    expect(rows()).toHaveLength(1);
    expect(screen.getByText('1 of 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clearThisField/i }));
    expect(filterBox()).toHaveValue('');
    expect(rows()).toHaveLength(3);
  });

  it('titles batch-action events and summarizes any event carrying a result note', () => {
    renderLog([
      makeEvent({
        id: 'ev-batch',
        eventName: 'invoke-batch-action',
        resultData: { note: 'processed patron request count: 4' },
      }),
      makeEvent({
        id: 'ev-bg',
        eventName: 'invoke-background-action',
        eventData: { action: 'Cancel' },
        resultData: { note: 'patron email sent successfully' },
      }),
    ]);

    expect(screen.getByText('ui-rs.eventHistory.event.invokeBatchAction')).toBeInTheDocument();
    expect(screen.getByText('processed patron request count: 4')).toBeInTheDocument();
    expect(screen.getByText('ui-rs.eventHistory.event.invokeBackgroundAction: Cancel')).toBeInTheDocument();
    expect(screen.getByText('patron email sent successfully')).toBeInTheDocument();
  });

  it('shows an error instead of a result note when both are present', () => {
    renderLog([makeEvent({
      eventStatus: 'ERROR',
      eventName: 'invoke-batch-action',
      resultData: { note: 'processed patron request count: 0', eventError: { Message: 'invalid cql selector' } },
    })]);

    expect(screen.getByText(/invalid cql selector/)).toBeInTheDocument();
    expect(screen.queryByText('processed patron request count: 0')).not.toBeInTheDocument();
  });

  it('distinguishes no matches from an empty log', () => {
    renderLog(events);
    fireEvent.change(filterBox(), { target: { value: 'nothing-matches-this' } });
    expect(screen.getByText('ui-rs.eventLog.noMatches')).toBeInTheDocument();
    expect(screen.queryByText('ui-rs.eventHistory.empty')).not.toBeInTheDocument();

    renderLog([]);
    expect(screen.getByText('ui-rs.eventHistory.empty')).toBeInTheDocument();
  });
});
