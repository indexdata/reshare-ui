import React from 'react';
// Provided by the shared Stripes test environment.
// eslint-disable-next-line import/no-extraneous-dependencies
import { fireEvent, render, screen } from '@testing-library/react';
import EntryPoints from './EntryPoints';

const mockHistoryPush = jest.fn();
let mockPathname;

jest.mock('react-intl', () => ({
  FormattedMessage: ({ id }) => id,
  useIntl: () => ({ formatMessage: ({ id }) => id }),
}));

jest.mock('react-router-dom', () => ({
  useHistory: () => ({ push: mockHistoryPush }),
  useLocation: () => ({ pathname: mockPathname, search: '?query=test' }),
}));

jest.mock('@folio/stripes/components', () => ({
  Button: ({ buttonStyle: _buttonStyle, children, marginBottom0: _marginBottom0, ...props }) => (
    <button type="button" {...props}>{children}</button>
  ),
  NavList: ({ children }) => <nav data-testid="edit-options">{children}</nav>,
  NavListItem: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  NavListSection: ({ children }) => <div>{children}</div>,
  Pane: ({ children, lastMenu }) => <div>{lastMenu}{children}</div>,
  PaneMenu: ({ children }) => <div>{children}</div>,
}));

jest.mock('@projectreshare/stripes-reshare', () => ({
  useCloseDirect: jest.fn(),
  useOkapiQuery: () => ({
    data: { id: 'entry-id', name: 'Test entry' },
    isSuccess: true,
  }),
}));

jest.mock('./ViewEntry', () => () => <div data-testid="entry-details" />);

describe('EntryPoints', () => {
  beforeEach(() => {
    mockHistoryPush.mockClear();
  });

  it('shows an Edit button with the entry details in view mode', () => {
    mockPathname = '/directory/entries/entry-points/entry-id';

    render(<EntryPoints id="entry-id" />);

    expect(screen.getByRole('button', { name: 'ui-rsdir.edit' })).toBeInTheDocument();
    expect(screen.queryByTestId('edit-options')).not.toBeInTheDocument();
    expect(screen.getByTestId('entry-details')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.edit' }));
    expect(mockHistoryPush).toHaveBeenCalledWith('/directory/entries/entry-points/entry-id/edit?query=test');
  });

  it('shows edit options above the entry details and hides Edit in edit mode', () => {
    mockPathname = '/directory/entries/entry-points/entry-id/edit';

    render(<EntryPoints id="entry-id" />);

    expect(screen.queryByRole('button', { name: 'ui-rsdir.edit' })).not.toBeInTheDocument();
    expect(screen.getByTestId('edit-options')).toBeInTheDocument();
    expect(screen.getByTestId('entry-details')).toBeInTheDocument();
  });
});
