import React from 'react';
import { Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import PullSlipRoute from './PullSlipRoute';

const mockOkapi = makeOkapiKyMock();
const mockPerformAction = jest.fn(() => Promise.resolve());

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);
jest.mock('@folio/stripes/core', () => require('#/test/stripesCore').makeStripesCoreMock(() => mockOkapi));
jest.mock('@projectreshare/stripes-reshare', () => ({
  ...jest.requireActual('@projectreshare/stripes-reshare'),
  usePerformAction: () => mockPerformAction,
}));

const markLabel = 'stripes-reshare.actions.pullslip-printed';

const renderSlip = (actions) => {
  mockOkapi.setResponses({ 'broker/patron_requests/req-1/actions': { actions } });
  // The PDF never arrives; only the pane's menu is under test.
  mockOkapi.post.mockImplementation(() => ({ blob: () => new Promise(() => {}) }));
  const history = createMemoryHistory({ initialEntries: ['/requests/req-1/pullslip'] });
  renderWithRs(<Route path="/requests/:id/pullslip" component={PullSlipRoute} />, { history });
  return history;
};

describe('PullSlipRoute', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks the slip printed and returns to the request', async () => {
    const history = renderSlip([{ name: 'pullslip-printed', primary: true, parameters: [] }]);

    fireEvent.click(await screen.findByRole('button', { name: markLabel }));

    expect(mockPerformAction).toHaveBeenCalledWith('pullslip-printed');
    await waitFor(() => expect(history.location.pathname).toBe('/requests/req-1'));
  });

  it('offers no mark button when the request cannot be marked', async () => {
    renderSlip([{ name: 'ship', primary: true, parameters: [] }]);

    await waitFor(() => expect(mockOkapi.calledUrls()).toContain('broker/patron_requests/req-1/actions'));
    expect(screen.queryByRole('button', { name: markLabel })).toBeNull();
  });
});
