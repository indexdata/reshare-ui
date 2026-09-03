import React from 'react';
import { Route } from 'react-router-dom';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import ScheduledActions from './ScheduledActions';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);
jest.mock('@folio/stripes/core', () => require('../../test/stripesCore').makeStripesCoreMock(
  () => mockOkapi,
));

// The view pane pulls in EventLog, and Jest cannot parse react-syntax-highlighter's
// ESM entry points — the import alone is enough to break the suite.
jest.mock('react-syntax-highlighter', () => ({
  LightAsync: ({ children }) => require('react').createElement('pre', null, children),
}));
jest.mock('react-syntax-highlighter/dist/esm/styles/hljs', () => ({ github: { hljs: {} } }));

const PATH = '/settings/rs/scheduled-actions';

const NO_EVENTS = { about: { count: 0 }, items: [] };

// The schedule summary needs an ICU template to preserve interpolated values.
const messages = {
  'ui-rs.settings.scheduledActions.scheduleSummary': '{days} at {times}',
};

const renderList = () => renderWithRs(
  <Route path={PATH} component={ScheduledActions} />,
  { initialEntries: [PATH], messages },
);

describe('ScheduledActions list', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a row per batch action with a readable schedule', async () => {
    mockOkapi.setResponses({
      'broker/batch_actions': {
        about: { count: 1 },
        items: [
          { id: 'a1', actionName: 'email-pullslips', schedule: 'FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=6,13;BYMINUTE=0', active: true, createdAt: '2026-05-01T00:00:00Z' },
        ],
      },
    });

    renderList();

    await waitFor(() => expect(screen.getByText('email-pullslips')).toBeInTheDocument());
    expect(screen.getByText('Mon, Wed at 06:00, 13:00')).toBeInTheDocument();
    expect(screen.getByText('ui-rs.settings.scheduledActions.status.active')).toBeInTheDocument();
    expect(mockOkapi.mock.calls.some(([path]) => path === 'broker/batch_actions')).toBe(true);
  });

  it('disables an active action from the view action menu', async () => {
    const action = {
      id: 'a1',
      actionName: 'email-pullslips',
      schedule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=6;BYMINUTE=0',
      batchQuery: 'state==REQ',
      active: true,
    };
    mockOkapi.setResponses({
      'broker/batch_actions': { about: { count: 1 }, items: [action] },
      'broker/batch_actions/a1': action,
      'broker/batch_actions/a1/events': NO_EVENTS,
    });

    renderList();

    fireEvent.click(await screen.findByText('email-pullslips'));
    fireEvent.click(await screen.findByRole('button', { name: 'stripes-components.paneMenuActionsToggleLabel' }));
    fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.scheduledActions.disable' }));

    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledWith('broker/batch_actions/a1/disable'));
  });

  describe('event history', () => {
    const action = {
      id: 'a1',
      actionName: 'request-aging',
      schedule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=6;BYMINUTE=0',
      batchQuery: 'state==REQ',
      active: true,
    };

    const openView = async (events) => {
      mockOkapi.setResponses({
        'broker/batch_actions': { about: { count: 1 }, items: [action] },
        'broker/batch_actions/a1': action,
        'broker/batch_actions/a1/events': events,
      });
      renderList();
      fireEvent.click(await screen.findByText('request-aging'));
    };

    it('lists events newest-first with result notes as summaries', async () => {
      await openView({
        about: { count: 3 },
        items: [
          {
            id: 'ev-bg',
            timestamp: '2026-05-02T06:01:00Z',
            eventName: 'invoke-background-action',
            eventType: 'TASK',
            eventStatus: 'SUCCESS',
            parentID: 'ev-2',
            eventData: { action: 'Cancel', batchActionData: { taskId: 'a1' } },
            resultData: { note: 'patron request closed' },
          },
          {
            id: 'ev-2',
            timestamp: '2026-05-02T06:00:00Z',
            eventName: 'invoke-batch-action',
            eventType: 'TASK',
            eventStatus: 'SUCCESS',
            eventData: { batchActionData: { taskId: 'a1' } },
            resultData: { note: 'processed patron request count: 4' },
          },
          {
            id: 'ev-1',
            timestamp: '2026-05-01T06:00:00Z',
            eventName: 'invoke-batch-action',
            eventType: 'TASK',
            eventStatus: 'ERROR',
            eventData: { batchActionData: { taskId: 'a1' } },
            resultData: { eventError: { Message: 'invalid cql selector' } },
          },
        ],
      });

      expect(await screen.findByText('ui-rs.eventHistory.event.invokeBackgroundAction: Cancel')).toBeInTheDocument();
      const events = screen.getAllByText('ui-rs.eventHistory.event.invokeBatchAction');
      expect(events).toHaveLength(2);
      expect(screen.getByText('patron request closed')).toBeInTheDocument();
      expect(screen.getByText('processed patron request count: 4')).toBeInTheDocument();
      expect(screen.getByText(/invalid cql selector/)).toBeInTheDocument();
      expect(events[0].closest('button')).toHaveTextContent('processed patron request count: 4');
    });

    it('reports an action with no events', async () => {
      await openView(NO_EVENTS);

      expect(await screen.findByText('ui-rs.settings.scheduledActions.events.empty')).toBeInTheDocument();
    });
  });
});
