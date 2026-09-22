import React from 'react';
import { screen } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import ViewMessageBanners from './ViewMessageBanners';

jest.mock('./chat/useNotifications', () => ({
  useNotificationList: () => ({ data: { items: [] } }),
}));

jest.mock('@folio/stripes/core', () => require('../test/stripesCore').makeStripesCoreMock(() => ({})));

const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const request = { id: 'pr-1', side: 'lending', state: 'SEARCHING', dueDate: soon };
const ship = [{ name: 'ship', primary: true, parameters: ['dueDate'] }];

describe('ViewMessageBanners', () => {
  it('warns before shipping when the loan is already due soon', () => {
    renderWithRs(<ViewMessageBanners request={request} actions={ship} />);
    expect(screen.getByText('ui-rs.view.banners.dueTooSoon')).toBeInTheDocument();
  });

  it('stays quiet when the due date is comfortable or shipping is not on offer', () => {
    const { unmount } = renderWithRs(
      <ViewMessageBanners request={{ ...request, dueDate: later }} actions={ship} />
    );
    expect(screen.queryByText('ui-rs.view.banners.dueTooSoon')).toBeNull();
    unmount();

    renderWithRs(<ViewMessageBanners request={request} actions={[{ name: 'add-item' }]} />);
    expect(screen.queryByText('ui-rs.view.banners.dueTooSoon')).toBeNull();
  });
});
