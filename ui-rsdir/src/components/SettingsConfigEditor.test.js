import React from 'react';
// Provided by the shared Stripes test environment.
// eslint-disable-next-line import/no-extraneous-dependencies
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsConfigEditor from './SettingsConfigEditor';
import { fieldMap as catalogFieldMapping } from '../routes/CatalogConfigRoute';

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
  Card: ({ cardClass, children, headerEnd, headerStart }) => (
    <section className={cardClass}>{headerStart}{headerEnd}{children}</section>
  ),
  IconButton: ({ 'aria-label': ariaLabel, disabled, id, onClick }) => (
    <button aria-label={ariaLabel} disabled={disabled} id={id} onClick={onClick} type="button">×</button>
  ),
  Select: ({ 'aria-label': ariaLabel, dataOptions, disabled, id, onChange, value }) => (
    <select aria-label={ariaLabel} disabled={disabled} id={id} onChange={onChange} value={value}>
      {dataOptions.map(option => (
        <option disabled={option.disabled} key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  ),
  TextField: ({ 'aria-label': ariaLabel, disabled, error, id, max, min, onChange, onKeyDown, type, value }) => (
    <>
      <input
        aria-label={ariaLabel}
        aria-invalid={!!error}
        disabled={disabled}
        id={id}
        max={max}
        min={min}
        onChange={onChange}
        onKeyDown={onKeyDown}
        type={type}
        value={value}
      />
      {error && <span role="alert">{error}</span>}
    </>
  ),
  Tooltip: ({ children }) => children({ ariaIds: {}, ref: jest.fn() }),
}));

const fieldMapping = [{ fieldName: 'selectedSymbols', valueType: 'symbolList' }];

const renderEditor = ({
  configKey = 'config',
  fieldMapping: editorFieldMapping = fieldMapping,
  initialResource,
} = {}) => render(
  <SettingsConfigEditor
    configKey={configKey}
    fieldLabelId={path => path}
    fieldMapping={editorFieldMapping}
    initialResource={initialResource || { [configKey]: {} }}
    resourcePath="directory/entries/by-id/entry-id"
    successMessage="Saved"
  />
);

beforeEach(() => {
  mockPatch.mockReset();
  mockKy.mockReset();
  mockPatch.mockResolvedValue({ text: () => Promise.resolve('') });
});

describe('SettingsConfigEditor numeric bounds', () => {
  it('enforces inclusive integer bounds and exposes them on the input', async () => {
    renderEditor({
      fieldMapping: [{
        fieldName: 'days',
        valueType: 'integer',
        minValue: 1,
        maxValue: 30,
      }],
      initialResource: { config: { days: 10 } },
    });

    fireEvent.click(document.getElementById('edit-settings-config-days'));
    const input = screen.getByRole('spinbutton', { name: 'days' });

    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('max', '30');

    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(document.getElementById('save-settings-config-days'));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a value greater than or equal to {minValue}.');
    expect(mockPatch).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '30' } });
    fireEvent.click(document.getElementById('save-settings-config-days'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id',
      { json: { config: { days: 30 } } },
    ));
  });

  it('enforces number bounds while adding an object-array value', async () => {
    renderEditor({
      fieldMapping: [{
        fieldName: 'items',
        valueType: 'objectArray',
        objectMap: [{
          fieldName: 'ratio',
          valueType: 'number',
          minValue: 0.5,
          maxValue: 1.5,
        }],
      }],
      initialResource: { config: { items: [] } },
    });

    fireEvent.click(document.getElementById('edit-settings-config-items'));
    const input = screen.getByRole('spinbutton', { name: 'ratio' });

    expect(input).toHaveAttribute('min', '0.5');
    expect(input).toHaveAttribute('max', '1.5');

    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.click(document.getElementById('add-settings-config-items'));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a value less than or equal to {maxValue}.');

    fireEvent.change(input, { target: { value: '0.5' } });
    fireEvent.click(document.getElementById('add-settings-config-items'));
    fireEvent.click(document.getElementById('save-settings-config-items'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id',
      { json: { config: { items: [{ ratio: 0.5 }] } } },
    ));
  });

  it.each([
    {
      field: { fieldName: 'name', minValue: 0 },
      message: 'can use minValue and maxValue only with type integer or number',
    },
    {
      field: { fieldName: 'count', valueType: 'integer', minValue: '0' },
      message: 'requires minValue to be a finite number',
    },
    {
      field: { fieldName: 'count', valueType: 'number', maxValue: Infinity },
      message: 'requires maxValue to be a finite number',
    },
    {
      field: { fieldName: 'count', valueType: 'integer', minValue: 2, maxValue: 1 },
      message: 'requires minValue to be less than or equal to maxValue',
    },
  ])('rejects an invalid numeric bound mapping: $message', ({ field, message }) => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderEditor({ fieldMapping: [field] })).toThrow(message);

    consoleError.mockRestore();
  });
});

describe('SettingsConfigEditor nullOnEmpty strings', () => {
  it('serializes an empty string selection as null', async () => {
    renderEditor({
      fieldMapping: [{
        fieldName: 'profile',
        nullOnEmpty: true,
        validChoices: ['Alma', 'FOLIO'],
      }],
      initialResource: { config: { profile: 'Alma' } },
    });

    fireEvent.click(document.getElementById('edit-settings-config-profile'));
    fireEvent.change(screen.getByRole('combobox', { name: 'profile' }), {
      target: { value: '' },
    });
    fireEvent.click(document.getElementById('save-settings-config-profile'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id',
      { json: { config: { profile: null } } },
    ));
  });

  it('applies recursively while preserving ordinary empty and whitespace strings', async () => {
    renderEditor({
      fieldMapping: [{
        fieldName: 'group',
        valueType: 'subField',
        subMap: [
          { fieldName: 'nullable', nullOnEmpty: true },
          { fieldName: 'ordinary' },
          { fieldName: 'whitespace', nullOnEmpty: true },
          {
            fieldName: 'items',
            valueType: 'objectArray',
            objectMap: [
              { fieldName: 'nullable', nullOnEmpty: true },
              { fieldName: 'ordinary' },
              { fieldName: 'marker' },
            ],
          },
        ],
      }],
      initialResource: {
        config: {
          group: {
            nullable: '',
            ordinary: '',
            whitespace: '   ',
            items: [{ nullable: '', ordinary: '', marker: 'present' }],
          },
        },
      },
    });

    fireEvent.click(document.getElementById('edit-settings-config-group'));
    fireEvent.click(document.getElementById('save-settings-config-group'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id',
      {
        json: {
          config: {
            group: {
              nullable: null,
              ordinary: '',
              whitespace: '   ',
              items: [{ nullable: null, ordinary: '', marker: 'present' }],
            },
          },
        },
      },
    ));
  });

  it('still rejects required empty strings before serialization', () => {
    renderEditor({
      fieldMapping: [{
        fieldName: 'requiredValue',
        nullOnEmpty: true,
        required: true,
      }],
      initialResource: { config: { requiredValue: '' } },
    });

    fireEvent.click(document.getElementById('edit-settings-config-requiredValue'));
    fireEvent.click(document.getElementById('save-settings-config-requiredValue'));

    expect(screen.getByRole('alert')).toHaveTextContent('Required');
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('rejects nullOnEmpty on a non-string mapping', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderEditor({
      fieldMapping: [{ fieldName: 'enabled', valueType: 'boolean', nullOnEmpty: true }],
    })).toThrow('can use nullOnEmpty only with type string');

    consoleError.mockRestore();
  });
});

describe('SettingsConfigEditor disabled fields', () => {
  it('greys out a disabled card without rendering its content or edit control', () => {
    renderEditor({
      fieldMapping: [
        { fieldName: 'disabledField', disabled: true },
        { fieldName: 'enabledField' },
      ],
      initialResource: {
        config: {
          disabledField: 'Hidden value',
          enabledField: 'Visible value',
        },
      },
    });

    const disabledCard = screen.getByText('disabledField').closest('section');

    expect(disabledCard).toHaveClass('disabledField');
    expect(screen.queryByText('Hidden value')).not.toBeInTheDocument();
    expect(document.getElementById('edit-settings-config-disabledField')).not.toBeInTheDocument();

    const enabledEditButton = document.getElementById('edit-settings-config-enabledField');
    expect(enabledEditButton.closest('section')).toHaveTextContent('Visible value');
    expect(enabledEditButton).toBeInTheDocument();
  });

  it('hides and preserves disabled subMap and objectMap values without validating them', async () => {
    renderEditor({
      fieldMapping: [{
        fieldName: 'group',
        valueType: 'subField',
        required: true,
        subMap: [
          { fieldName: 'hiddenScalar', disabled: true, required: true },
          {
            fieldName: 'requiredGroup',
            valueType: 'subField',
            required: true,
            subMap: [
              { fieldName: 'hiddenNested', disabled: true, required: true },
              { fieldName: 'nestedVisible' },
            ],
          },
          {
            fieldName: 'items',
            valueType: 'objectArray',
            objectMap: [
              { fieldName: 'hidden', disabled: true, required: true },
              { fieldName: 'visible' },
            ],
          },
          { fieldName: 'visible' },
        ],
      }],
      initialResource: {
        config: {
          group: {
            hiddenScalar: '',
            requiredGroup: { hiddenNested: 'Nested secret', nestedVisible: '' },
            items: [{ hidden: 'Stored secret', visible: '' }],
            visible: 'Visible value',
          },
        },
      },
    });

    expect(screen.getByText('hiddenScalar').closest('.disabledField')).toBeInTheDocument();
    expect(screen.getByText('hiddenNested').closest('.disabledField')).toBeInTheDocument();
    expect(screen.getByText('hidden:').closest('.disabledField')).toBeInTheDocument();
    expect(screen.queryByText('Nested secret')).not.toBeInTheDocument();
    expect(screen.queryByText('Stored secret')).not.toBeInTheDocument();

    fireEvent.click(document.getElementById('edit-settings-config-group'));

    expect(document.getElementById('settings-config-group-hiddenScalar')).not.toBeInTheDocument();
    expect(document.getElementById('settings-config-group-requiredGroup-hiddenNested')).not.toBeInTheDocument();
    expect(document.getElementById('settings-config-group-items-new-hidden')).not.toBeInTheDocument();
    expect(document.getElementById('settings-config-group-visible')).toHaveValue('Visible value');

    fireEvent.click(document.getElementById('save-settings-config-group'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id',
      {
        json: {
          config: {
            group: {
              hiddenScalar: '',
              requiredGroup: { hiddenNested: 'Nested secret', nestedVisible: '' },
              items: [{ hidden: 'Stored secret', visible: '' }],
              visible: 'Visible value',
            },
          },
        },
      },
    ));
  });
});

describe('SettingsConfigEditor onlyOne subFields', () => {
  it('shows the selected child and serializes an empty marker object by itself', async () => {
    renderEditor({
      configKey: 'catalogConfig',
      fieldMapping: catalogFieldMapping,
      initialResource: {
        catalogConfig: {
          holdingsFormat: {
            marc: { mainField: '852' },
          },
        },
      },
    });

    expect(screen.getByText('852')).toBeInTheDocument();
    expect(screen.queryByText('opac')).not.toBeInTheDocument();
    expect(screen.queryByText('reservoir')).not.toBeInTheDocument();

    fireEvent.click(document.getElementById('edit-settings-config-holdingsFormat'));

    const selector = screen.getByRole('combobox', { name: 'Selected value for {field}' });
    expect(selector).toHaveValue('marc');
    fireEvent.change(selector, { target: { value: 'reservoir' } });

    expect(screen.queryByText('852')).not.toBeInTheDocument();
    expect(screen.getAllByText('reservoir')).toHaveLength(2);

    fireEvent.click(document.getElementById('cancel-settings-config-holdingsFormat'));
    expect(screen.getByText('852')).toBeInTheDocument();
    expect(screen.queryByText('reservoir')).not.toBeInTheDocument();

    fireEvent.click(document.getElementById('edit-settings-config-holdingsFormat'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Selected value for {field}' }), {
      target: { value: 'reservoir' },
    });

    fireEvent.click(document.getElementById('save-settings-config-holdingsFormat'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id',
      {
        json: {
          catalogConfig: {
            holdingsFormat: { reservoir: {} },
          },
        },
      },
    ));
  });

  it('rejects multiple selected children until the selector resolves them', async () => {
    const exclusiveMapping = [{
      fieldName: 'format',
      valueType: 'subField',
      onlyOne: true,
      subMap: [
        { fieldName: 'first', valueType: 'subField', subMap: [{ fieldName: 'value' }] },
        { fieldName: 'second', valueType: 'subField', subMap: [{ fieldName: 'value' }] },
        { fieldName: 'blocked', valueType: 'subField', subMap: [], disabled: true },
      ],
    }];

    renderEditor({
      fieldMapping: exclusiveMapping,
      initialResource: {
        config: {
          format: {
            first: { value: 'First value' },
            second: { value: 'Second value' },
          },
        },
      },
    });

    expect(screen.getByText('First value')).toBeInTheDocument();
    expect(screen.getByText('Second value')).toBeInTheDocument();
    fireEvent.click(document.getElementById('edit-settings-config-format'));

    const selector = screen.getByRole('combobox', { name: 'Selected value for {field}' });
    expect(screen.getByRole('option', { name: 'blocked' })).toBeDisabled();
    fireEvent.change(selector, { target: { value: 'blocked' } });
    fireEvent.click(document.getElementById('save-settings-config-format'));

    expect(screen.getByRole('alert')).toHaveTextContent('Select no more than one value.');
    expect(selector).toHaveValue('');
    expect(mockPatch).not.toHaveBeenCalled();

    fireEvent.change(selector, {
      target: { value: 'second' },
    });
    fireEvent.click(document.getElementById('save-settings-config-format'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id',
      {
        json: {
          config: {
            format: { second: { value: 'Second value' } },
          },
        },
      },
    ));
  });

  it.each([
    { required: false, expectedError: undefined },
    { required: true, expectedError: 'Required' },
  ])('handles an empty selection when required is $required', async ({ required, expectedError }) => {
    renderEditor({
      fieldMapping: [{
        fieldName: 'format',
        valueType: 'subField',
        onlyOne: true,
        required,
        subMap: [{ fieldName: 'first' }, { fieldName: 'second' }],
      }],
      initialResource: { config: { format: { first: 'First value' } } },
    });

    fireEvent.click(document.getElementById('edit-settings-config-format'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Selected value for {field}' }), {
      target: { value: '' },
    });
    fireEvent.click(document.getElementById('save-settings-config-format'));

    if (expectedError) {
      expect(screen.getByRole('alert')).toHaveTextContent(expectedError);
      expect(mockPatch).not.toHaveBeenCalled();
      return;
    }

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id',
      {
        json: {
          config: { format: {} },
        },
      },
    ));
  });
});

describe('SettingsConfigEditor symbolList', () => {
  it('adds manual symbol values and patches a symbol-object array', async () => {
    renderEditor({
      initialResource: {
        config: {
          selectedSymbols: [
            { authority: 'TEST', symbol: 'ANINST', unused: 'discard me' },
            { authority: 'OLD', symbol: 'MISSING' },
          ],
        },
      },
    });

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
    renderEditor({
      initialResource: {
        config: {
          selectedSymbols: ['TEST:ANINST', { authority: 'TEST' }, { symbol: 'ANINSTTOO' }],
        },
      },
    });

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
    renderEditor({ initialResource: { config: { selectedSymbols: [] } } });

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

  it('uses a field-specific save error message and preserves the draft after a failed patch', async () => {
    const saveError = Object.assign(new Error('Request failed'), {
      response: { status: 400 },
    });
    mockPatch.mockRejectedValueOnce(saveError);

    renderEditor({
      fieldMapping: [{
        ...fieldMapping[0],
        getSaveErrorMessage: error => (error.response?.status === 400 ? 'Check the symbols.' : undefined),
      }],
      initialResource: {
        config: {
          selectedSymbols: [{ authority: 'TEST', symbol: 'ANINST' }],
        },
      },
    });

    fireEvent.click(document.getElementById('edit-settings-config-selectedSymbols'));
    fireEvent.click(document.getElementById('save-settings-config-selectedSymbols'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Check the symbols.');
    expect(screen.getByText('TEST:ANINST')).toBeInTheDocument();
    expect(document.getElementById('save-settings-config-selectedSymbols')).toBeInTheDocument();
  });

  it('falls back to the original error message when the field does not override it', async () => {
    mockPatch.mockRejectedValueOnce(new Error('Request failed'));

    renderEditor({
      fieldMapping: [{
        ...fieldMapping[0],
        getSaveErrorMessage: () => undefined,
      }],
      initialResource: { config: { selectedSymbols: [] } },
    });

    fireEvent.click(document.getElementById('edit-settings-config-selectedSymbols'));
    fireEvent.click(document.getElementById('save-settings-config-selectedSymbols'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Request failed');
  });

  it('adds symbols while assembling an object-array value and clears transient inputs', () => {
    const objectFieldMapping = [{
      fieldName: 'groups',
      valueType: 'objectArray',
      objectMap: [{ fieldName: 'symbols', valueType: 'symbolList', required: true }],
    }];

    renderEditor({
      fieldMapping: objectFieldMapping,
      initialResource: { config: { groups: [] } },
    });

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
