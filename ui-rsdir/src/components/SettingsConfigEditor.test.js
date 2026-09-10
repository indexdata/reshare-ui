import React from 'react';
// Provided by the shared Stripes test environment.
// eslint-disable-next-line import/no-extraneous-dependencies
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SettingsConfigEditor from './SettingsConfigEditor';

const mockPatch = jest.fn();
const mockKy = jest.fn();
const mockUseInfiniteQuery = jest.fn();
const mockFetchNextPage = jest.fn();

mockKy.patch = mockPatch;

jest.mock('react-intl', () => ({
  FormattedMessage: ({ defaultMessage, id }) => defaultMessage || id,
  useIntl: () => ({ formatMessage: ({ defaultMessage, id }) => defaultMessage || id }),
}));

jest.mock('@folio/stripes/core', () => {
  const { createContext } = jest.requireActual('react');

  return {
    CalloutContext: createContext({ sendCallout: jest.fn() }),
    useOkapiKy: () => mockKy,
  };
});

jest.mock('react-query', () => ({
  useInfiniteQuery: config => mockUseInfiniteQuery(config),
  useQueryClient: () => ({
    getQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  }),
}));

jest.mock('@folio/stripes/components', () => ({
  Button: ({ children, disabled, id, onClick }) => (
    <button disabled={disabled} id={id} onClick={onClick} type="button">{children}</button>
  ),
  Card: ({ children, headerEnd, headerStart }) => <section>{headerStart}{headerEnd}{children}</section>,
  IconButton: ({ 'aria-label': ariaLabel, disabled, id, onClick }) => (
    <button aria-label={ariaLabel} disabled={disabled} id={id} onClick={onClick} type="button">×</button>
  ),
  Select: ({ 'aria-label': ariaLabel, dataOptions, disabled, id, onChange, value }) => (
    <select aria-label={ariaLabel} disabled={disabled} id={id} onChange={onChange} value={value}>
      {dataOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  ),
  TextField: ({ 'aria-label': ariaLabel, id, onChange, value }) => (
    <input aria-label={ariaLabel} id={id} onChange={onChange} value={value} />
  ),
  Tooltip: ({ children }) => children({ ariaIds: {}, ref: jest.fn() }),
}));

const fieldMapping = [{ fieldName: 'selectedSymbols', valueType: 'symbolList' }];

describe('SettingsConfigEditor symbolList', () => {
  beforeEach(() => {
    mockPatch.mockReset();
    mockKy.mockReset();
    mockUseInfiniteQuery.mockReset();
    mockFetchNextPage.mockReset();
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          { items: [{ symbols: [{ authority: 'TEST', symbol: 'ANINST' }] }], about: { count: 2 } },
          { items: [{ symbols: [{ authority: 'TEST', symbol: 'ANINSTTOO' }, { authority: '', symbol: 'INVALID' }] }] },
        ],
      },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isError: false,
      isFetchingNextPage: false,
      isLoading: false,
    });
    mockPatch.mockResolvedValue({ text: () => Promise.resolve('') });
  });

  it('loads institution symbols, filters selected values, and patches a symbol-object array', async () => {
    render(
      <SettingsConfigEditor
        configKey="config"
        fieldLabelId={path => path}
        fieldMapping={fieldMapping}
        initialResource={{
          config: {
            selectedSymbols: [
              { authority: 'TEST', symbol: 'ANINST', unused: 'discard me' },
              { authority: 'OLD', symbol: 'MISSING' },
            ],
          },
        }}
        resourcePath="directory/entries/by-id/entry-id"
        successMessage="Saved"
      />
    );

    expect(screen.getByText('TEST:ANINST')).toBeInTheDocument();
    expect(screen.getByText('OLD:MISSING')).toBeInTheDocument();
    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(expect.objectContaining({
      enabled: true,
      queryKey: ['directory/entries', 'type=Institution', 'symbolList'],
    }));

    fireEvent.click(document.getElementById('edit-settings-config-selectedSymbols'));

    const selector = screen.getByRole('combobox', { name: 'Select a symbol for {field}' });
    expect(within(selector).queryByRole('option', { name: 'TEST:ANINST' })).not.toBeInTheDocument();
    const newSymbolOption = within(selector).getByRole('option', { name: 'TEST:ANINSTTOO' });

    fireEvent.change(selector, { target: { value: newSymbolOption.value } });
    expect(screen.getByText('TEST:ANINSTTOO')).toBeInTheDocument();
    expect(within(selector).queryByRole('option', { name: 'TEST:ANINSTTOO' })).not.toBeInTheDocument();

    fireEvent.click(document.getElementById('remove-settings-config-selectedSymbols-1'));
    fireEvent.click(document.getElementById('save-settings-config-selectedSymbols'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id',
      {
        json: {
          config: {
            selectedSymbols: [
              { authority: 'TEST', symbol: 'ANINST' },
              { authority: 'TEST', symbol: 'ANINSTTOO' },
            ],
          },
        },
      },
    ));
  });

  it('ignores legacy strings and malformed symbol objects', () => {
    render(
      <SettingsConfigEditor
        configKey="config"
        fieldLabelId={path => path}
        fieldMapping={fieldMapping}
        initialResource={{
          config: {
            selectedSymbols: ['TEST:ANINST', { authority: 'TEST' }, { symbol: 'ANINSTTOO' }],
          },
        }}
        resourcePath="directory/entries/by-id/entry-id"
        successMessage="Saved"
      />
    );

    expect(screen.queryByText('TEST:ANINST')).not.toBeInTheDocument();
    expect(screen.queryByText('TEST:ANINSTTOO')).not.toBeInTheDocument();

    fireEvent.click(document.getElementById('edit-settings-config-selectedSymbols'));

    const selector = screen.getByRole('combobox', { name: 'Select a symbol for {field}' });
    expect(within(selector).getByRole('option', { name: 'TEST:ANINST' })).toBeInTheDocument();
    expect(within(selector).getByRole('option', { name: 'TEST:ANINSTTOO' })).toBeInTheDocument();
  });

  it('requests successive institution pages and waits for completion', async () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [{
          items: [{ symbols: [{ authority: 'TEST', symbol: 'ANINST' }] }],
          about: { count: 2 },
        }],
      },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isError: false,
      isFetchingNextPage: false,
      isLoading: false,
    });

    render(
      <SettingsConfigEditor
        configKey="config"
        fieldLabelId={path => path}
        fieldMapping={fieldMapping}
        initialResource={{ config: { selectedSymbols: [] } }}
        resourcePath="directory/entries/by-id/entry-id"
        successMessage="Saved"
      />
    );

    await waitFor(() => expect(mockFetchNextPage).toHaveBeenCalledTimes(1));
    fireEvent.click(document.getElementById('edit-settings-config-selectedSymbols'));
    expect(screen.getByRole('combobox', { name: 'Select a symbol for {field}' })).toBeDisabled();

    const queryConfig = mockUseInfiniteQuery.mock.calls[0][0];
    const firstPage = { items: [{ id: 'one' }], about: { count: 2 } };
    const lastPage = { items: [{ id: 'two' }] };
    expect(queryConfig.getNextPageParam(firstPage, [firstPage])).toEqual(1);
    expect(queryConfig.getNextPageParam(lastPage, [firstPage, lastPage])).toBeUndefined();

    const json = jest.fn().mockResolvedValue({ items: [] });
    mockKy.mockReturnValue({ json });
    await queryConfig.queryFn({ pageParam: 1000 });
    expect(mockKy).toHaveBeenCalledWith(
      'directory/entries?cql=type%3DInstitution&limit=1000&offset=1000',
    );
    expect(json).toHaveBeenCalledTimes(1);
  });

  it('keeps symbols with colliding display labels distinct', async () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [{
          items: [{
            symbols: [
              { authority: 'A:B', symbol: 'C' },
              { authority: 'A', symbol: 'B:C' },
            ],
          }],
          about: { count: 1 },
        }],
      },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isError: false,
      isFetchingNextPage: false,
      isLoading: false,
    });

    render(
      <SettingsConfigEditor
        configKey="config"
        fieldLabelId={path => path}
        fieldMapping={fieldMapping}
        initialResource={{ config: { selectedSymbols: [] } }}
        resourcePath="directory/entries/by-id/entry-id"
        successMessage="Saved"
      />
    );

    fireEvent.click(document.getElementById('edit-settings-config-selectedSymbols'));

    const selector = screen.getByRole('combobox', { name: 'Select a symbol for {field}' });
    const collidingOptions = within(selector).getAllByRole('option', { name: 'A:B:C' });
    expect(collidingOptions).toHaveLength(2);
    expect(collidingOptions[0].value).not.toEqual(collidingOptions[1].value);
    const authorityWithColonOption = collidingOptions.find(option => JSON.parse(option.value)[0] === 'A:B');

    fireEvent.change(selector, { target: { value: authorityWithColonOption.value } });
    fireEvent.click(document.getElementById('save-settings-config-selectedSymbols'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id',
      { json: { config: { selectedSymbols: [{ authority: 'A:B', symbol: 'C' }] } } },
    ));
  });
});
