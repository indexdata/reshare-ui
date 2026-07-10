import React from 'react';
import { Route } from 'react-router-dom';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../../test/renderWithRs';
import { makeOkapiKyMock } from '../../test/okapiKyMock';
import ScheduledActions from './ScheduledActions';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('../../test/iconMock').default);
jest.mock('@folio/stripes/core', () => require('../../test/stripesCore').makeStripesCoreMock(
  () => mockOkapi,
));

const PATH = '/settings/rs/scheduled-actions';

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
    });

    renderList();

    fireEvent.click(await screen.findByText('email-pullslips'));
    fireEvent.click(await screen.findByRole('button', { name: 'stripes-components.paneMenuActionsToggleLabel' }));
    fireEvent.click(screen.getByRole('button', { name: 'ui-rs.settings.scheduledActions.disable' }));

    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledWith('broker/batch_actions/a1/disable'));
  });
});
