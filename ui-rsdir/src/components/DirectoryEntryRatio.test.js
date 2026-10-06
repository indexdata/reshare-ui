import React from 'react';
// Provided by the shared Stripes test environment.
// eslint-disable-next-line import/no-extraneous-dependencies
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditEntryRoute from '../routes/EditEntryRoute';
import ViewEntry from './ViewEntry';

const mockPost = jest.fn();
const mockPatch = jest.fn();
let mockEntry;

jest.mock('react-intl', () => ({
  FormattedMessage: ({ children, id }) => (typeof children === 'function' ? children([id]) : id),
  useIntl: () => ({ formatMessage: ({ id }) => id }),
}));

jest.mock('@folio/stripes/core', () => ({
  CalloutContext: jest.requireActual('react').createContext({ sendCallout: jest.fn() }),
  useOkapiKy: () => ({ post: mockPost, patch: mockPatch }),
  useStripes: () => ({ config: {} }),
}));

jest.mock('@projectreshare/stripes-reshare', () => ({
  useCloseDirect: () => jest.fn(),
  useOkapiQuery: path => ({
    data: path.includes('/by-id/') ? mockEntry : [],
    isSuccess: true,
  }),
  DirectLink: ({ children }) => <span>{children}</span>,
}));

jest.mock('react-query', () => ({
  useMutation: ({ mutationFn }) => ({ mutateAsync: mutationFn }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock('react-router-dom', () => ({
  Prompt: () => null,
  useParams: () => ({ id: mockEntry?.id }),
  useHistory: () => ({ push: jest.fn() }),
  useLocation: () => ({ search: '' }),
}));

jest.mock('./AddressesField', () => () => null);
jest.mock('./SymbolsField', () => () => null);
jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);

jest.mock('@folio/stripes/components', () => {
  const Container = ({ children }) => <div>{children}</div>;

  return {
    Accordion: Container,
    AccordionSet: Container,
    Card: Container,
    Col: Container,
    Row: Container,
    Headline: Container,
    IconButton: () => null,
    Pane: ({ children, footer }) => <div>{children}{footer}</div>,
    PaneFooter: ({ renderStart, renderEnd }) => <div>{renderStart}{renderEnd}</div>,
    Button: ({ children, disabled, onClick, type }) => (
      <button disabled={disabled} onClick={onClick} type={type === 'submit' ? 'submit' : 'button'}>{children}</button>
    ),
    KeyValue: ({ label, value }) => <div>{label}<span>{value}</span></div>,
    Select: ({ input, dataOptions, disabled, label }) => (
      <label htmlFor={input.name}>
        {label}
        <select {...input} id={input.name} aria-label={label.props.id} disabled={disabled}>
          <option value="">Select</option>
          {dataOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    ),
    TextField: jest.requireActual('@folio/stripes-components/lib/TextField').default,
  };
});

const ratioInput = () => screen.getByRole('textbox', { name: /ui-rsdir.entry.lendToBorrowRatio/ });
const saveButton = () => screen.getByRole('button', { name: mockEntry ? 'ui-rsdir.edit.submit' : 'ui-rsdir.create' });

beforeEach(() => {
  mockEntry = undefined;
  mockPost.mockReset();
  mockPatch.mockReset();
  mockPost.mockResolvedValue({ json: () => Promise.resolve({ id: 'new-entry' }) });
  mockPatch.mockResolvedValue(undefined);
});

describe('Directory Entry ratio', () => {
  it('renders visible help linked to the actual Stripes text input', () => {
    render(<EditEntryRoute />);
    const help = screen.getByText('ui-rsdir.entry.lendToBorrowRatio.help');

    expect(help.tagName).toBe('P');
    expect(document.getElementById(ratioInput().getAttribute('aria-describedby'))).toBe(help);
    expect(ratioInput().getAttribute('sub')).toBeNull();
  });

  it.each([false, true])('allows creating an entry without a ratio (cleared: %p)', async cleared => {
    render(<EditEntryRoute />);
    fireEvent.change(screen.getByRole('textbox', { name: 'ui-rsdir.entry.name' }), { target: { value: 'Library' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'ui-rsdir.entry.type' }), { target: { value: 'Institution' } });
    if (cleared) {
      fireEvent.change(ratioInput(), { target: { value: '50:2' } });
      fireEvent.change(ratioInput(), { target: { value: '' } });
      fireEvent.blur(ratioInput());
    }
    fireEvent.click(saveButton());

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('directory/entries', {
      json: expect.objectContaining({ name: 'Library', type: 'Institution' }),
    }));
    expect(mockPost.mock.calls[0][1].json.lendToBorrowRatio).toBeUndefined();
  });

  it('normalizes a new ratio before submitting even without blur', async () => {
    render(<EditEntryRoute />);
    fireEvent.change(screen.getByRole('textbox', { name: 'ui-rsdir.entry.name' }), { target: { value: 'Library' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'ui-rsdir.entry.type' }), { target: { value: 'Institution' } });
    fireEvent.change(ratioInput(), { target: { value: '0001:0002.50' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('directory/entries', {
      json: expect.objectContaining({ lendToBorrowRatio: '01:02.50' }),
    }));
  });

  it('populates existing values, normalizes on blur, and patches only the ratio', async () => {
    mockEntry = { id: 'entry-id', name: 'Library', type: 'Institution', lendToBorrowRatio: '50:2' };
    render(<EditEntryRoute />);
    expect(ratioInput().value).toBe('50:2');
    fireEvent.change(ratioInput(), { target: { value: '0000.01:0002.50' } });
    fireEvent.blur(ratioInput());
    expect(ratioInput().value).toBe('0.01:02.50');
    fireEvent.click(saveButton());

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('directory/entries/by-id/entry-id', {
      json: { lendToBorrowRatio: '0.01:02.50' },
    }));
  });

  it('retains invalid input, shows an error, and prevents saving', () => {
    mockEntry = { id: 'entry-id', name: 'Library', type: 'Institution' };
    render(<EditEntryRoute />);
    fireEvent.change(ratioInput(), { target: { value: '00001:2' } });
    fireEvent.blur(ratioInput());
    expect(ratioInput().value).toBe('00001:2');
    expect(screen.getByText('ui-rsdir.entry.lendToBorrowRatio.invalid').closest('[role="alert"]')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
    fireEvent.click(saveButton());
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('clears an existing ratio with an explicit null PATCH', async () => {
    mockEntry = { id: 'entry-id', name: 'Library', type: 'Institution', lendToBorrowRatio: '50:2' };
    render(<EditEntryRoute />);
    fireEvent.change(ratioInput(), { target: { value: '' } });
    fireEvent.blur(ratioInput());
    fireEvent.click(saveButton());

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('directory/entries/by-id/entry-id', {
      json: { lendToBorrowRatio: null },
    }));
  });

  it('displays normalized stored ratios without changing the entry', () => {
    const entry = { id: 'entry-id', type: 'Consortium', lendToBorrowRatio: '0001:0000.50' };
    render(<ViewEntry entry={entry} />);
    expect(screen.getByText('01:0.50')).toBeTruthy();
    expect(entry.lendToBorrowRatio).toBe('0001:0000.50');
    expect(mockPatch).not.toHaveBeenCalled();
  });
});
