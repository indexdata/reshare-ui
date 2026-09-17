import React from 'react';
// Provided by the shared Stripes test environment.
// eslint-disable-next-line import/no-extraneous-dependencies
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsConfigEditor from './SettingsConfigEditor';

const mockPatch = jest.fn();
const mockKy = jest.fn();

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
  TextField: ({ 'aria-label': ariaLabel, disabled, error, id, onChange, onKeyDown, value }) => (
    <>
      <input
        aria-label={ariaLabel}
        aria-invalid={!!error}
        disabled={disabled}
        id={id}
        onChange={onChange}
        onKeyDown={onKeyDown}
        value={value}
      />
      {error && <span role="alert">{error}</span>}
    </>
  ),
  Tooltip: ({ children }) => children({ ariaIds: {}, ref: jest.fn() }),
}));

const fieldMapping = [{ fieldName: 'selectedSymbols', valueType: 'symbolList' }];

describe('SettingsConfigEditor symbolList', () => {
  beforeEach(() => {
    mockPatch.mockReset();
    mockKy.mockReset();
    mockPatch.mockResolvedValue({ text: () => Promise.resolve('') });
  });

  it('adds manual symbol values and patches a symbol-object array', async () => {
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
    expect(mockKy).not.toHaveBeenCalled();

    fireEvent.click(document.getElementById('edit-settings-config-selectedSymbols'));

    const authorityInput = screen.getByRole('textbox', { name: 'New authority for {field}' });
    const nameInput = screen.getByRole('textbox', { name: 'New name for {field}' });
    const addButton = document.getElementById('add-settings-config-selectedSymbols');

    expect(addButton).toBeDisabled();
    fireEvent.change(authorityInput, { target: { value: ' TEST ' } });
    expect(addButton).toBeDisabled();
    fireEvent.change(nameInput, { target: { value: ' ANINSTTOO ' } });
    expect(addButton).toBeEnabled();
    fireEvent.click(addButton);

    expect(screen.getByText('TEST:ANINSTTOO')).toBeInTheDocument();
    expect(authorityInput).toHaveValue('');
    expect(nameInput).toHaveValue('');

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

  it('ignores malformed values and requires both manual fields', () => {
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

    const authorityInput = screen.getByRole('textbox', { name: 'New authority for {field}' });
    const nameInput = screen.getByRole('textbox', { name: 'New name for {field}' });
    const addButton = document.getElementById('add-settings-config-selectedSymbols');

    fireEvent.change(authorityInput, { target: { value: 'TEST' } });
    expect(addButton).toBeDisabled();
    fireEvent.change(authorityInput, { target: { value: '   ' } });
    fireEvent.change(nameInput, { target: { value: 'ANINST' } });
    expect(addButton).toBeDisabled();
  });

  it('supports Enter, preserves colliding labels, and rejects exact duplicates', async () => {
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

    const authorityInput = screen.getByRole('textbox', { name: 'New authority for {field}' });
    const nameInput = screen.getByRole('textbox', { name: 'New name for {field}' });

    fireEvent.change(authorityInput, { target: { value: 'A:B' } });
    fireEvent.change(nameInput, { target: { value: 'C' } });
    fireEvent.keyDown(nameInput, { key: 'Enter' });
    fireEvent.change(authorityInput, { target: { value: 'A' } });
    fireEvent.change(nameInput, { target: { value: 'B:C' } });
    fireEvent.keyDown(authorityInput, { key: 'Enter' });

    expect(screen.getAllByText('A:B:C')).toHaveLength(2);

    fireEvent.change(authorityInput, { target: { value: 'A:B' } });
    fireEvent.change(nameInput, { target: { value: 'C' } });
    fireEvent.click(document.getElementById('add-settings-config-selectedSymbols'));
    expect(screen.getAllByText('A:B:C')).toHaveLength(2);
    expect(screen.getByRole('alert')).toHaveTextContent('The symbol {symbol} already exists.');
    expect(authorityInput).toHaveValue('A:B');
    expect(nameInput).toHaveValue('C');

    fireEvent.change(authorityInput, { target: { value: 'A:B ' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.keyDown(nameInput, { key: 'Enter' });
    expect(screen.getByRole('alert')).toHaveTextContent('The symbol {symbol} already exists.');
    expect(screen.getAllByText('A:B:C')).toHaveLength(2);
    fireEvent.click(document.getElementById('save-settings-config-selectedSymbols'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id',
      {
        json: {
          config: {
            selectedSymbols: [
              { authority: 'A:B', symbol: 'C' },
              { authority: 'A', symbol: 'B:C' },
            ],
          },
        },
      },
    ));
  });

  it('adds symbols while assembling an object-array value and clears transient inputs', () => {
    const objectFieldMapping = [{
      fieldName: 'groups',
      valueType: 'objectArray',
      objectMap: [{ fieldName: 'symbols', valueType: 'symbolList', required: true }],
    }];

    render(
      <SettingsConfigEditor
        configKey="config"
        fieldLabelId={path => path}
        fieldMapping={objectFieldMapping}
        initialResource={{ config: { groups: [] } }}
        resourcePath="directory/entries/by-id/entry-id"
        successMessage="Saved"
      />
    );

    fireEvent.click(document.getElementById('edit-settings-config-groups'));
    const authorityInput = screen.getByRole('textbox', { name: 'New authority for {field}' });
    const nameInput = screen.getByRole('textbox', { name: 'New name for {field}' });

    fireEvent.change(authorityInput, { target: { value: 'ISIL' } });
    fireEvent.change(nameInput, { target: { value: 'ABC' } });
    fireEvent.click(document.getElementById('add-settings-config-groups-new-symbols'));

    expect(screen.getByText('ISIL:ABC')).toBeInTheDocument();
    expect(authorityInput).toHaveValue('');
    expect(nameInput).toHaveValue('');

    fireEvent.change(authorityInput, { target: { value: 'ISIL' } });
    fireEvent.change(nameInput, { target: { value: 'ABC' } });
    fireEvent.click(document.getElementById('add-settings-config-groups-new-symbols'));
    expect(screen.getByRole('alert')).toHaveTextContent('The symbol {symbol} already exists.');
    expect(authorityInput).toHaveValue('ISIL');
    expect(nameInput).toHaveValue('ABC');

    fireEvent.change(nameInput, { target: { value: 'ABD' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(document.getElementById('add-settings-config-groups'));
    expect(screen.getByText('ISIL:ABC')).toBeInTheDocument();
    expect(authorityInput).toHaveValue('');
    expect(nameInput).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
