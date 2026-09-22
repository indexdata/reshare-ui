import React from 'react';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import Volumes from './Volumes';

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);

const mockPerformAction = jest.fn(() => Promise.resolve());

jest.mock('@projectreshare/stripes-reshare', () => ({
  ...jest.requireActual('@projectreshare/stripes-reshare'),
  useIsActionPending: () => false,
  usePerformAction: () => (...args) => mockPerformAction(...args),
}));

const messages = {
  'ui-rs.flow.volumes.remove.ariaLabel': 'Remove item {barcode}',
};

const items = [
  { id: 'i-1', barcode: '30001000123456', title: 'Volume 1', callNumber: 'PN1993.5', lmsStatus: 'CHECKED_OUT' },
  { id: 'i-2', barcode: '30001000654321', title: 'Volume 2', lmsStatus: 'UNKNOWN' },
];

const removable = [{ name: 'remove-item' }, { name: 'ship' }];

const renderVolumes = (request, actions) => renderWithRs(
  <Volumes request={request} actions={actions} />,
  { messages, timeZone: 'UTC' }
);

describe('Volumes accordion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when no items are attached', () => {
    const { container } = renderVolumes({ id: 'pr-1', items: [] }, removable);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each attached item', () => {
    renderVolumes({ id: 'pr-1', items }, []);

    expect(screen.getByText('30001000123456')).toBeInTheDocument();
    expect(screen.getByText('30001000654321')).toBeInTheDocument();
    expect(screen.getByText('PN1993.5')).toBeInTheDocument();
  });

  it('shows the title column for a single item', () => {
    renderVolumes({ id: 'pr-1', items: [items[0]] }, []);
    expect(screen.getByText('ui-rs.flow.volumes.title')).toBeInTheDocument();
    expect(screen.getByText('Volume 1')).toBeInTheDocument();
  });

  it('shows each confirmed LMS status and leaves unconfirmed ones blank', () => {
    renderVolumes({ id: 'pr-1', items }, []);

    expect(screen.getByText('ui-rs.flow.volumes.lmsStatus')).toBeInTheDocument();
    expect(screen.getByText('ui-rs.flow.volumes.lmsStatus.CHECKED_OUT')).toBeInTheDocument();
    expect(screen.queryByText('ui-rs.flow.volumes.lmsStatus.UNKNOWN')).not.toBeInTheDocument();
  });

  it('shows the due date the LMS confirmed at checkout', () => {
    renderVolumes({ id: 'pr-1', items: [{ ...items[0], lmsDueDate: '2026-10-18T21:00:00Z' }] }, []);

    expect(screen.getByText('ui-rs.flow.volumes.lmsDueDate')).toBeInTheDocument();
    expect(screen.getByText('10/18/2026, 9:00 PM UTC')).toBeInTheDocument();
  });

  it('treats an item without an LMS status as unconfirmed', () => {
    renderVolumes({ id: 'pr-1', items: [{ id: 'i-3', barcode: '30001000999999' }] }, []);
    expect(screen.queryByText(/^ui-rs\.flow\.volumes\.lmsStatus\./)).not.toBeInTheDocument();
  });

  it('offers removal only when the action is available', () => {
    const { unmount } = renderVolumes({ id: 'pr-1', items }, [{ name: 'ship' }]);
    expect(screen.queryByLabelText(/^Remove item/)).not.toBeInTheDocument();
    unmount();

    renderVolumes({ id: 'pr-1', items }, removable);
    expect(screen.getAllByLabelText(/^Remove item/)).toHaveLength(2);
  });

  it('removes the row it was clicked on, by barcode, after confirmation', async () => {
    renderVolumes({ id: 'pr-1', items }, removable);

    fireEvent.click(screen.getByLabelText('Remove item 30001000654321'));
    fireEvent.click(screen.getByText('ui-rs.flow.volumes.remove.confirmLabel').closest('button'));

    await waitFor(() => expect(mockPerformAction).toHaveBeenCalledWith(
      'remove-item',
      { barcode: '30001000654321' },
    ));
  });

  it('does not act when the confirmation is cancelled', () => {
    renderVolumes({ id: 'pr-1', items }, removable);

    fireEvent.click(screen.getByLabelText('Remove item 30001000123456'));
    fireEvent.click(screen.getByText('stripes-components.cancel').closest('button'));

    expect(mockPerformAction).not.toHaveBeenCalled();
  });
});
