import React from 'react';
// Provided by the shared Stripes test environment.
// eslint-disable-next-line import/no-extraneous-dependencies
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
// Provided by the shared Stripes test environment.
// eslint-disable-next-line import/no-extraneous-dependencies
import userEvent from '@testing-library/user-event';
import SettingsConfigEditor from './SettingsConfigEditor';
import { fieldMap as baseCatalogFieldMapping } from '../routes/CatalogConfigRoute';
import { applyDisabledPaths, hostProfilesFromOpenApi, selectionChangeImpact as changeImpact, vendorFieldMappingForVendor as mapVendorFields } from '../config/vendorFieldMapping';

import specWithProfiles from '../../test/fixtures/directoryOpenApi';

const { names, vendorFieldMapping, vendorFieldValues } = hostProfilesFromOpenApi(specWithProfiles);
const catalogFieldMapping = baseCatalogFieldMapping.map(field => (
  field.fieldName === 'profile' ? { ...field, validChoices: names } : field
));
const vendorFieldMappingForVendor = (fields, vendor, configKey, setting) => (
  mapVendorFields(fields, vendor, configKey, vendorFieldMapping, setting, vendorFieldValues)
);
const selectionChangeImpact = options => changeImpact({ ...options, vendorFieldMapping });

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);

const mockPatch = jest.fn();
const mockKy = jest.fn();
let mockOpenApiData;
let mockOpenApiState;
let mockMessages;

jest.mock('../hooks/useDirectoryOpenApi', () => ({
  __esModule: true,
  default: () => ({ data: mockOpenApiData, ...mockOpenApiState }),
}));

mockKy.patch = mockPatch;

jest.mock('react-intl', () => ({
  FormattedMessage: ({ defaultMessage, id, values = {} }) => (
    (defaultMessage || id).replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
  ),
  useIntl: () => ({
    messages: mockMessages,
    formatMessage: ({ defaultMessage, id }) => mockMessages[id] || defaultMessage || id,
  }),
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
  MultiSelection: jest.requireActual('@folio/stripes-components/lib/MultiSelection').default,
  Badge: jest.requireActual('@folio/stripes-components/lib/Badge').default,
  ConfirmationModal: jest.requireActual('@folio/stripes-components/lib/ConfirmationModal').default,
  Icon: ({ icon, 'aria-hidden': ariaHidden }) => <svg aria-hidden={ariaHidden} data-icon={icon} />,
  Popover: jest.requireActual('@folio/stripes-components/lib/Popover').default,
  Button: ({ children, disabled, id, onClick }) => (
    <button disabled={disabled} id={id} onClick={onClick} type="button">{children}</button>
  ),
  Card: ({ cardClass, children, headerEnd, headerStart }) => (
    <section className={cardClass}>{headerStart}{headerEnd}{children}</section>
  ),
  IconButton: jest.requireActual('react').forwardRef(({ icon, iconSize: _iconSize, size: _size, ...props }, ref) => (
    <button {...props} data-icon={icon} ref={ref} type="button">×</button>
  )),
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
  Tooltip: jest.requireActual('@folio/stripes-components/lib/Tooltip').default,
}));

const fieldMapping = [{ fieldName: 'selectedSymbols', valueType: 'symbolList' }];

const renderEditor = ({
  configKey = 'config',
  fieldMapping: editorFieldMapping = fieldMapping,
  initialResource,
  onSave,
  getSelectionChangeImpact,
} = {}) => render(
  <SettingsConfigEditor
    configKey={configKey}
    fieldLabelId={path => path}
    fieldMapping={editorFieldMapping}
    initialResource={initialResource || { [configKey]: {} }}
    getSelectionChangeImpact={getSelectionChangeImpact}
    onSave={onSave}
    resourcePath="directory/entries/by-id/entry-id"
    successMessage="Saved"
  />
);

beforeEach(() => {
  mockOpenApiData = undefined;
  mockOpenApiState = {};
  mockMessages = {};
  mockPatch.mockReset();
  mockKy.mockReset();
  mockPatch.mockResolvedValue({ text: () => Promise.resolve('') });
});

describe('SettingsConfigEditor field descriptions', () => {
  const descriptionMapping = [
    { fieldName: 'address', defaultDesc: 'Manual address help' },
    { fieldName: 'requesterPatronPattern' },
    { fieldName: 'ncipNamespaceEnabled', valueType: 'boolean' },
    {
      fieldName: 'patronProfiles',
      valueType: 'objectArray',
      objectMap: [{ fieldName: 'code' }],
    },
  ];
  const spec = { components: { schemas: {
    LmsConfig: { properties: {
      address: { description: 'API address help' },
      requesterPatronPattern: { description: "'{requesterSymbol}' is replaced with the agency ISIL" },
      patronProfiles: { type: 'array', items: { properties: { code: { description: 'Profile code' } } } },
    } },
  } } };

  it('prefers manual help, preserves placeholders and shows help on hover and focus', async () => {
    mockOpenApiData = spec;
    renderEditor({ configKey: 'lmsConfig', fieldMapping: descriptionMapping });
    const trigger = document.getElementById('settings-config-address-description-trigger');
    expect(trigger).toHaveAttribute('data-icon', 'info');
    expect(trigger.parentElement.querySelector('.fieldLabelText')).toHaveTextContent('address');
    expect(trigger.compareDocumentPosition(trigger.parentElement.querySelector('.fieldLabelText')))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(trigger).toHaveAccessibleDescription('Manual address help');
    expect(screen.queryByText('API address help')).not.toBeInTheDocument();
    expect(document.getElementById('settings-config-ncipNamespaceEnabled-description-trigger')).not.toBeInTheDocument();
    fireEvent.mouseOver(trigger);
    await waitFor(() => expect(document.querySelector('[data-test-tooltip-text]')).toHaveTextContent('Manual address help'));
    fireEvent.mouseOut(trigger);
    await waitFor(() => expect(document.querySelector('[data-test-tooltip-text]')).not.toBeInTheDocument());
    const patternTrigger = document.getElementById('settings-config-requesterPatronPattern-description-trigger');
    fireEvent.focus(patternTrigger);
    await waitFor(() => expect(document.querySelector('[data-test-tooltip-text]'))
      .toHaveTextContent("'{requesterSymbol}' is replaced with the agency ISIL"));
  });

  it('adds late-arriving help without changing an active draft and gives array instances unique IDs', () => {
    const resource = { lmsConfig: { requesterPatronPattern: 'original', patronProfiles: [{ code: 'STAFF' }, { code: 'STUDENT' }] } };
    const { rerender } = renderEditor({ configKey: 'lmsConfig', fieldMapping: descriptionMapping, initialResource: resource });
    fireEvent.click(document.getElementById('edit-settings-config-requesterPatronPattern'));
    fireEvent.change(screen.getByRole('textbox', { name: 'requesterPatronPattern' }), { target: { value: 'draft' } });
    mockOpenApiData = spec;
    rerender(<SettingsConfigEditor
      configKey="lmsConfig"
      fieldLabelId={path => path}
      fieldMapping={descriptionMapping}
      initialResource={resource}
      resourcePath="directory/entries/by-id/entry-id"
    />);
    expect(screen.getByRole('textbox', { name: 'requesterPatronPattern' })).toHaveValue('draft');
    expect(document.getElementById('settings-config-requesterPatronPattern-description-trigger')).toBeInTheDocument();
    fireEvent.click(document.getElementById('edit-settings-config-patronProfiles'));
    const triggers = screen.getAllByRole('button', { name: 'Show description for {field}' }).filter(trigger => trigger.id.includes('patronProfiles-code-'));
    expect(triggers).toHaveLength(3);
    expect(new Set(triggers.map(trigger => trigger.id)).size).toBe(3);
    triggers.forEach(trigger => expect(trigger).toHaveAccessibleDescription('Profile code'));
  });
});

describe('SettingsConfigEditor selection confirmation', () => {
  const vendorMapping = [{
    fieldName: 'vendor',
    valueType: 'string',
    nullOnEmpty: true,
    validChoices: ['Alma', 'Koha', 'Generic', 'WMS'],
  }];
  const vendorImpact = ({ fieldName, nextValue, resource }) => (
    fieldName === 'vendor' ? selectionChangeImpact({ configKey: 'lmsConfig', nextValue, resource }) : undefined
  );

  it('lists only new override paths and applies the captured choice only after confirmation', async () => {
    renderEditor({
      configKey: 'lmsConfig',
      fieldMapping: vendorMapping,
      getSelectionChangeImpact: vendorImpact,
      initialResource: { lmsConfig: { vendor: 'Generic' } },
    });
    fireEvent.click(document.getElementById('edit-settings-config-vendor'));
    const selector = screen.getByRole('combobox', { name: 'vendor' });
    fireEvent.change(selector, { target: { value: 'Alma' } });
    expect(selector).toHaveValue('Generic');
    expect(screen.getByRole('dialog')).toHaveTextContent('Using LMSConfig vendor Alma');
    expect(screen.getByRole('heading', { name: 'ui-rsdir.entry.section.catalogConfig' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ui-rsdir.entry.section.lmsConfig' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('holdingsFormat › opac › availabilityRule')).toBeInTheDocument();
    expect(mockPatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm change' }));
    expect(selector).toHaveValue('Alma');
    expect(mockPatch).not.toHaveBeenCalled();
    fireEvent.click(document.getElementById('save-settings-config-vendor'));
    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id', { json: { lmsConfig: { vendor: 'Alma' } } },
    ));
  });

  it('preserves the previous draft on cancellation, Escape, and repeated selections', async () => {
    const user = userEvent.setup();
    renderEditor({
      configKey: 'lmsConfig',
      fieldMapping: vendorMapping,
      getSelectionChangeImpact: vendorImpact,
      initialResource: { lmsConfig: { vendor: 'Generic' } },
    });
    fireEvent.click(document.getElementById('edit-settings-config-vendor'));
    const selector = screen.getByRole('combobox', { name: 'vendor' });
    fireEvent.change(selector, { target: { value: 'Alma' } });
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(selector).toHaveValue('Generic');
    fireEvent.change(selector, { target: { value: 'Koha' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    await user.keyboard('{Escape}');
    expect(selector).toHaveValue('Generic');
    fireEvent.change(selector, { target: { value: 'Koha' } });
    await user.click(screen.getByRole('button', { name: 'Confirm change' }));
    expect(selector).toHaveValue('Koha');
    fireEvent.change(selector, { target: { value: 'Alma' } });
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(selector).toHaveValue('Koha');
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('skips confirmation for unchanged selections and changes with no applicable overrides', () => {
    renderEditor({
      configKey: 'lmsConfig',
      fieldMapping: vendorMapping,
      getSelectionChangeImpact: vendorImpact,
      initialResource: { lmsConfig: { vendor: 'Generic' }, catalogConfig: { profile: 'Koha' } },
    });
    fireEvent.click(document.getElementById('edit-settings-config-vendor'));
    const selector = screen.getByRole('combobox', { name: 'vendor' });
    fireEvent.change(selector, { target: { value: 'Generic' } });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.change(selector, { target: { value: 'WMS' } });
    expect(selector).toHaveValue('WMS');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.change(selector, { target: { value: '' } });
    expect(selector).toHaveValue('');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    ['Alma', 'Koha', 0],
    ['Koha', 'Alma', 1],
    ['Alma', 'Alma', 0],
  ])('explains profile %s protection when selecting vendor %s with %s LMS impacts', (vendor, profile, count) => {
    renderEditor({
      configKey: 'lmsConfig',
      fieldMapping: vendorMapping,
      getSelectionChangeImpact: vendorImpact,
      initialResource: { lmsConfig: { vendor: 'Generic' }, catalogConfig: { profile } },
    });
    fireEvent.click(document.getElementById('edit-settings-config-vendor'));
    const selector = screen.getByRole('combobox', { name: 'vendor' });
    fireEvent.change(selector, { target: { value: vendor } });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(`CatalogConfig is currently configured by profile ${profile}.`);
    expect(dialog).toHaveTextContent(`Changing the LMSConfig vendor to ${vendor} will not affect CatalogConfig.`);
    expect(within(dialog).queryAllByRole('listitem')).toHaveLength(count);
    expect(within(dialog).queryByRole('heading', { name: 'ui-rsdir.entry.section.catalogConfig' })).not.toBeInTheDocument();
    if (count === 0) {
      expect(dialog).toHaveTextContent(`Change LMSConfig vendor to ${vendor}?`);
      expect(dialog).not.toHaveTextContent('following fields');
    }
    expect(selector).toHaveValue('Generic');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(selector).toHaveValue('Generic');
    fireEvent.change(selector, { target: { value: vendor } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm change' }));
    expect(selector).toHaveValue(vendor);
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('continues confirming nonempty profiles but skips confirmation when clearing the confirmed draft', () => {
    renderEditor({
      configKey: 'catalogConfig',
      fieldMapping: catalogFieldMapping,
      getSelectionChangeImpact: ({ fieldName, nextValue, resource }) => (
        fieldName === 'profile' ? selectionChangeImpact({ configKey: 'catalogConfig', nextValue, resource }) : undefined
      ),
      initialResource: { lmsConfig: { vendor: 'Alma' }, catalogConfig: { profile: 'Koha' } },
    });
    fireEvent.click(document.getElementById('edit-settings-config-profile'));
    const selector = screen.getByRole('combobox', { name: 'profile' });
    fireEvent.change(selector, { target: { value: 'Sierra' } });
    expect(screen.getByRole('dialog')).toHaveTextContent('Using CatalogConfig profile Sierra');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm change' }));
    fireEvent.change(selector, { target: { value: '' } });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(selector).toHaveValue('');
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it.each([
    ['lmsConfig', 'vendor', 'Alma', 'Koha'],
    ['lmsConfig', 'vendor', 'Alma', undefined],
    ['catalogConfig', 'profile', 'Alma', 'Koha'],
    ['catalogConfig', 'profile', undefined, 'Koha'],
  ])('clears %s.%s without a modal and saves null with vendor %s and profile %s', async (
    configKey, fieldName, vendor, profile,
  ) => {
    renderEditor({
      configKey,
      fieldMapping: configKey === 'lmsConfig' ? vendorMapping : catalogFieldMapping,
      getSelectionChangeImpact: ({ fieldName: changedField, nextValue, resource }) => (
        changedField === fieldName ? selectionChangeImpact({ configKey, nextValue, resource }) : undefined
      ),
      initialResource: { lmsConfig: { vendor }, catalogConfig: { profile } },
    });
    fireEvent.click(document.getElementById(`edit-settings-config-${fieldName}`));
    const selector = screen.getByRole('combobox', { name: fieldName });
    fireEvent.change(selector, { target: { value: '' } });
    expect(selector).toHaveValue('');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockPatch).not.toHaveBeenCalled();
    fireEvent.click(document.getElementById(`save-settings-config-${fieldName}`));
    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id', { json: { [configKey]: { [fieldName]: null } } },
    ));
  });

  it.each(['entry', 'settings'])('discards pending confirmation when %s changes', change => {
    const editor = (resourcePath, initialResource) => (
      <SettingsConfigEditor
        configKey="lmsConfig"
        fieldLabelId={path => path}
        fieldMapping={vendorMapping}
        getSelectionChangeImpact={vendorImpact}
        initialResource={initialResource}
        resourcePath={resourcePath}
        successMessage="Saved"
      />
    );
    const initialResource = { lmsConfig: { vendor: 'Generic' } };
    const { rerender } = render(editor('entry-one', initialResource));
    fireEvent.click(document.getElementById('edit-settings-config-vendor'));
    fireEvent.change(screen.getByRole('combobox', { name: 'vendor' }), { target: { value: 'Alma' } });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    rerender(editor(change === 'entry' ? 'entry-two' : 'entry-one',
      { ...initialResource, catalogConfig: { profile: 'Koha' } }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('preserves a confirmed draft after a save failure', async () => {
    mockPatch.mockRejectedValue(new Error('Save failed'));
    renderEditor({
      configKey: 'lmsConfig',
      fieldMapping: vendorMapping,
      getSelectionChangeImpact: vendorImpact,
      initialResource: { lmsConfig: { vendor: 'Generic' } },
    });
    fireEvent.click(document.getElementById('edit-settings-config-vendor'));
    const selector = screen.getByRole('combobox', { name: 'vendor' });
    fireEvent.change(selector, { target: { value: 'Alma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm change' }));
    fireEvent.click(document.getElementById('save-settings-config-vendor'));
    expect(mockPatch).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.getElementById('save-settings-config-vendor')).toBeEnabled());
    expect(selector).toHaveValue('Alma');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('SettingsConfigEditor override attribution', () => {
  it('opens with click or keyboard, dismisses normally, and never saves', async () => {
    const user = userEvent.setup();
    renderEditor({
      configKey: 'lmsConfig',
      fieldMapping: vendorFieldMappingForVendor([
        { fieldName: 'ncipNamespaceEnabled', valueType: 'boolean' },
        { fieldName: 'address' },
        { fieldName: 'unrelated', disabled: true },
      ], 'Generic', 'lmsConfig'),
      initialResource: { lmsConfig: { ncipNamespaceEnabled: true, unrelated: 'hidden' } },
    });
    const badge = screen.getByRole('button', { name: 'Show override source for {field}' });
    expect(badge).toHaveTextContent('[Generic]');
    expect(badge).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('edit-settings-config-ncipNamespaceEnabled')).not.toBeInTheDocument();
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
    await user.click(badge);
    expect(screen.getByRole('dialog')).toHaveTextContent('Overridden by LMSConfig vendor: Generic');
    expect(badge).toHaveAttribute('aria-expanded', 'true');
    await user.click(badge);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    badge.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(badge).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByText('address'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('identifies profile overrides on locked and nested labels and updates an open explanation', async () => {
    const initialResource = { catalogConfig: { holdingsFormat: { opac: { availabilityRule: 'hidden' } } } };
    const editor = setting => (
      <SettingsConfigEditor
        configKey="catalogConfig"
        fieldLabelId={path => path}
        fieldMapping={vendorFieldMappingForVendor(catalogFieldMapping, 'Alma', 'catalogConfig', setting)}
        initialResource={initialResource}
        resourcePath="directory/entries/by-id/entry-id"
        successMessage="Saved"
      />
    );
    const { rerender } = render(editor('catalogConfig.profile'));
    expect(screen.getAllByText('[Alma]')).toHaveLength(6);
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
    const card = screen.getByText('holdingsFormat').closest('section');
    const badge = card.querySelector('button');
    fireEvent.click(badge);
    expect(screen.getByRole('dialog')).toHaveTextContent('Overridden by CatalogConfig profile: Alma');
    rerender(editor('lmsConfig.vendor'));
    expect(screen.getByRole('dialog')).toHaveTextContent('Overridden by LMSConfig vendor: Alma');
    fireEvent.click(document.getElementById('edit-settings-config-holdingsFormat'));
    expect(screen.getAllByText('[Alma]')).toHaveLength(6);
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('attributes object-array child labels in display and editing modes', () => {
    renderEditor({
      fieldMapping: applyDisabledPaths([{
        fieldName: 'items',
        valueType: 'objectArray',
        objectMap: [{ fieldName: 'fixed' }, { fieldName: 'editable' }],
      }], ['items.fixed'], { setting: 'catalogConfig.profile', name: 'Koha' }),
      initialResource: { config: { items: [{ fixed: 'hidden', editable: 'visible' }] } },
    });
    expect(screen.getAllByText('[Koha]')).toHaveLength(1);
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
    fireEvent.click(document.getElementById('edit-settings-config-items'));
    expect(screen.getAllByText('[Koha]')).toHaveLength(2);
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
  });
});

describe('SettingsConfigEditor save callback', () => {
  it('notifies the caller after a successful save', async () => {
    let resolveSave;
    mockPatch.mockReturnValue(new Promise(resolve => { resolveSave = resolve; }));
    const onSave = jest.fn();
    renderEditor({
      fieldMapping: [{ fieldName: 'isPickupLocation', valueType: 'boolean' }],
      onSave,
    });
    fireEvent.click(document.getElementById('edit-settings-config-isPickupLocation'));
    fireEvent.change(screen.getByRole('combobox', { name: 'isPickupLocation' }), { target: { value: 'true' } });
    fireEvent.click(document.getElementById('save-settings-config-isPickupLocation'));
    expect(onSave).not.toHaveBeenCalled();

    resolveSave({ text: () => Promise.resolve('') });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });

  it('does not notify the caller when saving fails', async () => {
    mockPatch.mockRejectedValue(new Error('Save failed'));
    const onSave = jest.fn();
    renderEditor({
      fieldMapping: [{ fieldName: 'isPickupLocation', valueType: 'boolean' }],
      onSave,
    });
    fireEvent.click(document.getElementById('edit-settings-config-isPickupLocation'));
    fireEvent.change(screen.getByRole('combobox', { name: 'isPickupLocation' }), { target: { value: 'true' } });
    fireEvent.click(document.getElementById('save-settings-config-isPickupLocation'));
    expect(document.getElementById('save-settings-config-isPickupLocation')).toBeDisabled();
    await waitFor(() => expect(document.getElementById('save-settings-config-isPickupLocation')).toBeEnabled());
    expect(onSave).not.toHaveBeenCalled();
  });
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
    expect(screen.getByText('hidden').closest('.disabledField')).toBeInTheDocument();
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
  it('enforces nested locks and preserves other values in the required branch', async () => {
    const mapping = [{
      fieldName: 'format',
      valueType: 'subField',
      onlyOne: true,
      subMap: [{
        fieldName: 'first',
        valueType: 'subField',
        onlyOne: true,
        subMap: [{
          fieldName: 'nested',
          valueType: 'subField',
          subMap: [{ fieldName: 'provided' }, { fieldName: 'editable' }],
        }, { fieldName: 'alternative' }],
      }, { fieldName: 'second' }],
    }];
    renderEditor({
      fieldMapping: applyDisabledPaths(mapping, ['format.first.nested.provided']),
      initialResource: { config: { format: {
        first: { nested: { provided: 'fixed', editable: 'keep' }, alternative: 'remove' },
        second: 'remove',
      } } },
    });
    fireEvent.click(document.getElementById('edit-settings-config-format'));
    const selectors = screen.getAllByRole('combobox', { name: 'Selected value for {field}' });
    expect(selectors.map(selector => selector.value)).toEqual(['first', 'nested']);
    selectors.forEach(selector => expect(selector).toBeDisabled());
    const input = screen.getByRole('textbox', { name: 'editable' });
    fireEvent.change(input, { target: { value: 'changed' } });
    fireEvent.click(document.getElementById('save-settings-config-format'));
    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id',
      { json: { config: { format: { first: { nested: { provided: 'fixed', editable: 'changed' } } } } } },
    ));
  });

  it.each([
    ['Alma', 'opac'],
    ['Koha', 'marc'],
  ])('locks %s to %s while retaining editable branch values', async (vendor, branch) => {
    const branchValues = branch === 'opac' ?
      { availabilityRule: 'availableNow', shelvingLocationSource: 'shelvingLocation' } :
      { mainField: '852', itemIdSubField: 'editable' };
    renderEditor({
      configKey: 'catalogConfig',
      fieldMapping: vendorFieldMappingForVendor(catalogFieldMapping, vendor, 'catalogConfig'),
      initialResource: { catalogConfig: { holdingsFormat: { [branch]: branchValues } } },
    });
    fireEvent.click(document.getElementById('edit-settings-config-holdingsFormat'));
    const selector = screen.getByRole('combobox', { name: 'Selected value for {field}' });
    expect(selector).toBeDisabled();
    expect(selector).toHaveValue(branch);
    fireEvent.change(selector, { target: { value: '' } });
    fireEvent.change(selector, { target: { value: 'reservoir' } });
    expect(selector).toHaveValue(branch);
    const input = screen.getByRole(branch === 'opac' ? 'combobox' : 'textbox', {
      name: branch === 'opac' ? 'shelvingLocationSource' : 'itemIdSubField',
    });
    const changedValue = branch === 'opac' ? 'localLocation' : 'changed';
    expect(input).toBeEnabled();
    fireEvent.change(input, { target: { value: changedValue } });
    fireEvent.click(document.getElementById('save-settings-config-holdingsFormat'));
    await waitFor(() => expect(mockPatch).toHaveBeenCalled());
    const saved = mockPatch.mock.calls[0][1].json.catalogConfig.holdingsFormat;
    expect(Object.keys(saved)).toEqual([branch]);
    expect(saved[branch]).toMatchObject({
      ...branchValues,
      [branch === 'opac' ? 'shelvingLocationSource' : 'itemIdSubField']: changedValue,
    });
  });

  it.each([
    {},
    { marc: { mainField: '852' } },
    { marc: { mainField: '852' }, opac: { availablePublicNotes: ['keep'] } },
  ])('normalizes conflicting or absent branches only on explicit save: %j', async holdingsFormat => {
    renderEditor({
      configKey: 'catalogConfig',
      fieldMapping: vendorFieldMappingForVendor(catalogFieldMapping, 'Alma', 'catalogConfig'),
      initialResource: { catalogConfig: { holdingsFormat: { ...holdingsFormat, extra: 'keep' } } },
    });
    expect(screen.queryByText('852')).not.toBeInTheDocument();
    expect(mockPatch).not.toHaveBeenCalled();
    fireEvent.click(document.getElementById('edit-settings-config-holdingsFormat'));
    expect(screen.getByRole('combobox', { name: 'Selected value for {field}' })).toHaveValue('opac');
    fireEvent.click(document.getElementById('cancel-settings-config-holdingsFormat'));
    expect(mockPatch).not.toHaveBeenCalled();
    fireEvent.click(document.getElementById('edit-settings-config-holdingsFormat'));
    fireEvent.click(document.getElementById('save-settings-config-holdingsFormat'));
    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      'directory/entries/by-id/entry-id',
      { json: { catalogConfig: { holdingsFormat: { extra: 'keep', opac: holdingsFormat.opac || {} } } } },
    ));
  });

  it('updates locks during editing and releases them when the effective profile is cleared', () => {
    const initialResource = { catalogConfig: { holdingsFormat: { opac: { availablePublicNotes: ['keep'] } } } };
    const editor = vendor => (
      <SettingsConfigEditor
        configKey="catalogConfig"
        fieldLabelId={path => path}
        fieldMapping={vendorFieldMappingForVendor(catalogFieldMapping, vendor, 'catalogConfig')}
        initialResource={initialResource}
        resourcePath="directory/entries/by-id/entry-id"
        successMessage="Saved"
      />
    );
    const { rerender } = render(editor('Alma'));
    fireEvent.click(document.getElementById('edit-settings-config-holdingsFormat'));
    fireEvent.change(screen.getByRole('combobox', { name: 'shelvingLocationSource' }), {
      target: { value: 'localLocation' },
    });
    rerender(editor('FOLIO'));
    expect(screen.queryByText('[Alma]')).not.toBeInTheDocument();
    expect(screen.getAllByText('[FOLIO]')).toHaveLength(7);
    expect(screen.getByRole('combobox', { name: 'shelvingLocationSource' })).toHaveValue('localLocation');
    rerender(editor('Koha'));
    expect(screen.queryByText('[FOLIO]')).not.toBeInTheDocument();
    expect(screen.getAllByText('[Koha]')).toHaveLength(6);
    const selector = screen.getByRole('combobox', { name: 'Selected value for {field}' });
    expect(selector).toHaveValue('marc');
    expect(selector).toBeDisabled();
    rerender(editor('Generic'));
    expect(selector).toBeEnabled();
    fireEvent.change(selector, { target: { value: 'reservoir' } });
    expect(selector).toHaveValue('reservoir');
    expect(mockPatch).not.toHaveBeenCalled();
  });

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

describe('SettingsConfigEditor read-only override values', () => {
  it('displays top-level overrides with no edit button and hides unrelated disabled fields', () => {
    renderEditor({
      fieldMapping: applyDisabledPaths([{ fieldName: 'address' }, { fieldName: 'hidden', disabled: true }],
        ['address'], { setting: 'lmsConfig.vendor', name: 'Custom' }, { address: 'profile-address' }),
      initialResource: { config: { address: 'stored-address', hidden: 'stored-secret' } },
    });
    expect(screen.getByText('profile-address')).toBeInTheDocument();
    expect(screen.queryByText('stored-address')).not.toBeInTheDocument();
    expect(screen.queryByText('stored-secret')).not.toBeInTheDocument();
    expect(document.getElementById('edit-settings-config-address')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('displays falsy and empty values while keeping display metadata out of a parent save', async () => {
    const fields = [{ fieldName: 'group',
      valueType: 'subField',
      subMap: [
        { fieldName: 'enabled', valueType: 'boolean' },
        { fieldName: 'zero', valueType: 'number' },
        { fieldName: 'empty' }, { fieldName: 'cleared' },
        { fieldName: 'list', valueType: 'stringArray' }, { fieldName: 'fixed' }, { fieldName: 'editable' },
      ] }];
    const overrideValues = {
      'group.enabled': false,
      'group.zero': 0,
      'group.empty': '',
      'group.cleared': null,
      'group.list': [],
      'group.fixed': 'profile-value',
    };
    const initialResource = { config: { group: {
      enabled: true,
      zero: 9,
      empty: 'stored-empty',
      cleared: 'stored-cleared',
      list: ['stored-list'],
      fixed: 'stored-fixed',
      editable: 'original',
    } } };
    renderEditor({
      fieldMapping: applyDisabledPaths(fields, Object.keys(overrideValues),
        { setting: 'catalogConfig.profile', name: 'Custom' }, overrideValues),
      initialResource,
    });
    const assertValues = () => {
      ['false', '0', '""', 'null', '[]', 'profile-value'].forEach(value => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
      expect(screen.queryByText('stored-fixed')).not.toBeInTheDocument();
      expect(screen.queryByText('stored-list')).not.toBeInTheDocument();
    };
    assertValues();
    fireEvent.click(document.getElementById('edit-settings-config-group'));
    assertValues();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'editable' }), { target: { value: 'changed' } });
    fireEvent.click(document.getElementById('save-settings-config-group'));
    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('directory/entries/by-id/entry-id', {
      json: { config: { group: { ...initialResource.config.group, editable: 'changed' } } },
    }));
  });

  it('renders Koha availability rules as labeled objects without collection controls', () => {
    renderEditor({
      configKey: 'catalogConfig',
      fieldMapping: vendorFieldMappingForVendor(catalogFieldMapping, 'Koha', 'catalogConfig'),
      initialResource: { catalogConfig: { holdingsFormat: { marc: { mainField: '852' } } } },
    });
    expect(screen.getByText('952')).toBeInTheDocument();
    expect(screen.queryByText('852')).not.toBeInTheDocument();
    const rules = screen.getByText('availability').closest('.subField');
    expect(within(rules).getByText('equals')).toBeInTheDocument();
    expect(within(rules).getByText('absent')).toBeInTheDocument();
    expect(rules.querySelectorAll('.objectArrayValue')).toHaveLength(2);
    fireEvent.click(document.getElementById('edit-settings-config-holdingsFormat'));
    expect(within(rules).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(rules).queryByRole('combobox')).not.toBeInTheDocument();
    expect(rules.querySelectorAll('button')).toHaveLength(1);
    expect(screen.getByText('952')).toBeInTheDocument();
  });

  it('updates effective values with the profile and restores stored values when overrides end', () => {
    const initialResource = { catalogConfig: { holdingsFormat: { opac: {
      availabilityRule: 'availableNow', availablePublicNotes: ['stored-note'], includeItemId: true,
    } } } };
    const editor = profile => <SettingsConfigEditor
      configKey="catalogConfig"
      fieldLabelId={path => path}
      fieldMapping={vendorFieldMappingForVendor(catalogFieldMapping, profile, 'catalogConfig', 'catalogConfig.profile')}
      initialResource={initialResource}
      resourcePath="directory/entries/by-id/entry-id"
    />;
    const { rerender } = render(editor('Alma'));
    expect(screen.getByText('availableNow')).toBeInTheDocument();
    rerender(editor('Sierra'));
    expect(screen.queryByText('availableNow')).not.toBeInTheDocument();
    expect(screen.getByText('publicNote')).toBeInTheDocument();
    expect(screen.getByText('AVAILABLE')).toBeInTheDocument();
    expect(screen.queryByText('stored-note')).not.toBeInTheDocument();
    const itemId = screen.getByText('includeItemId').closest('.subField');
    expect(within(itemId).getByText('false')).toBeInTheDocument();
    fireEvent.click(document.getElementById('edit-settings-config-holdingsFormat'));
    expect(screen.getByText('AVAILABLE')).toBeInTheDocument();
    expect(document.getElementById('add-settings-config-holdingsFormat-opac-availablePublicNotes')).not.toBeInTheDocument();
    rerender(editor(undefined));
    expect(screen.getByRole('combobox', { name: 'availabilityRule' })).toHaveValue('availableNow');
    expect(screen.queryByText('[Sierra]')).not.toBeInTheDocument();
    expect(screen.getByText('stored-note')).toBeInTheDocument();
  });

  it('shows child overrides on existing and new object-array rows without editing controls', () => {
    renderEditor({
      fieldMapping: applyDisabledPaths([{ fieldName: 'items',
        valueType: 'objectArray',
        objectMap: [{ fieldName: 'fixed' }, { fieldName: 'editable' }] }], ['items.fixed'], { setting: 'catalogConfig.profile', name: 'Custom' }, { 'items.fixed': 'profile-child' }),
      initialResource: { config: { items: [{ fixed: 'stored-child', editable: 'visible' }] } },
    });
    expect(screen.getByText('profile-child')).toBeInTheDocument();
    expect(screen.queryByText('stored-child')).not.toBeInTheDocument();
    fireEvent.click(document.getElementById('edit-settings-config-items'));
    expect(screen.getAllByText('profile-child')).toHaveLength(2);
    expect(document.getElementById('settings-config-items-new-fixed')).not.toBeInTheDocument();
  });
});


describe('SettingsConfigEditor predefined code/description arrays', () => {
  const field = {
    fieldName: 'loanConditions',
    valueType: 'objectArray',
    objectMap: [{ fieldName: 'code', required: true }, { fieldName: 'defaultDesc', required: true }],
  };
  const pairs = [
    { code: 'LibraryUseOnly', defaultDesc: 'Use in library only' },
    { code: 'NoReproduction', defaultDesc: 'No reproduction' },
  ];
  const spec = { components: { schemas: { IllConfig: { properties: {
    loanConditions: { 'x-default-data': Object.fromEntries(pairs.map(item => [item.code, item.defaultDesc])) },
  } } } } };
  const edit = () => fireEvent.click(document.getElementById('edit-settings-config-loanConditions'));
  const addSelected = () => fireEvent.click(screen.getByRole('button', { name: 'Add selected' }));
  const save = () => fireEvent.click(document.getElementById('save-settings-config-loanConditions'));
  const selectOption = async (user, label) => {
    const input = screen.getByRole('combobox', { name: 'Add predefined' });
    if (input.getAttribute('aria-expanded') !== 'true') await user.click(input);
    await user.click(await screen.findByRole('option', { name: (_name, element) => element.textContent.startsWith(label) }));
  };

  beforeEach(() => { mockOpenApiData = spec; });

  it('adds several defaults in selection order, removes and reoffers codes, and saves original pairs', async () => {
    const user = userEvent.setup();
    renderEditor({ configKey: 'illConfig', fieldMapping: [field] });
    edit();
    expect(screen.getByRole('button', { name: 'Add selected' })).toBeDisabled();
    expect(screen.queryByRole('textbox', { name: 'code' })).not.toBeInTheDocument();
    await selectOption(user, 'NoReproduction: No reproduction');
    await selectOption(user, 'LibraryUseOnly: Use in library only');
    addSelected();
    expect(screen.getByText('All predefined entries added.')).toBeInTheDocument();
    expect(mockPatch).not.toHaveBeenCalled();
    fireEvent.click(document.getElementById('remove-settings-config-loanConditions-0'));
    await selectOption(user, 'NoReproduction: No reproduction');
    addSelected();
    save();
    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('directory/entries/by-id/entry-id', {
      json: { illConfig: { loanConditions: pairs } },
    }));
  });

  it('searches descriptions and selects options by keyboard without accepting free text', async () => {
    const user = userEvent.setup();
    renderEditor({ configKey: 'illConfig', fieldMapping: [{ ...field, defaultOnly: true }] });
    edit();
    const input = screen.getByRole('combobox', { name: 'Add predefined' });
    await user.type(input, 'reproduction');
    expect(await screen.findByRole('option', { name: (_name, element) => element.textContent.startsWith('NoReproduction: No reproduction') })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('option', { name: (_name, element) => element.textContent.startsWith('LibraryUseOnly: Use in library only') })).not.toBeInTheDocument());
    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByRole('button', { name: 'Add selected' })).toBeEnabled();
    addSelected();
    expect(screen.getByText('No reproduction')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add custom' })).not.toBeInTheDocument();
    save();
    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(expect.anything(), {
      json: { illConfig: { loanConditions: [pairs[1]] } },
    }));
  });

  it('preserves existing nonmatching entries, filters by code rather than description, and allows removal', async () => {
    const legacy = [{ code: 'LibraryUseOnly', defaultDesc: 'Customized' }, { code: 'Retired', defaultDesc: 'Old value' }];
    renderEditor({ configKey: 'illConfig',
      fieldMapping: [{ ...field, defaultOnly: true }],
      initialResource: { illConfig: { loanConditions: legacy } } });
    edit();
    expect(screen.getByText('Customized')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: 'Add predefined' }));
    expect(screen.queryByRole('option', { name: (_name, element) => element.textContent.startsWith('LibraryUseOnly: Use in library only') })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    save();
    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(expect.anything(), {
      json: { illConfig: { loanConditions: legacy } },
    }));
  });

  it.each([
    { defaultOnly: true, nested: false },
    { defaultOnly: false, nested: false },
    { defaultOnly: true, nested: true },
    { defaultOnly: false, nested: true },
  ])('retains saved blank strings after removing and adding entries (defaultOnly=$defaultOnly, nested=$nested)', async ({ defaultOnly, nested }) => {
    const legacy = [{ code: 'Legacy', defaultDesc: '' }, { code: '', defaultDesc: '' }];
    const arrayField = { ...field, defaultOnly };
    const fields = nested ? [{ fieldName: 'group', valueType: 'subField', subMap: [arrayField] }] : [arrayField];
    const initialValue = { loanConditions: [pairs[0], ...legacy] };
    const root = nested ? 'group' : 'loanConditions';
    const arrayPath = nested ? 'group-loanConditions' : 'loanConditions';
    if (nested) {
      mockOpenApiData = { components: { schemas: { IllConfig: { properties: {
        group: { properties: spec.components.schemas.IllConfig.properties },
      } } } } };
    }
    renderEditor({ configKey: 'illConfig',
      fieldMapping: fields,
      initialResource: { illConfig: nested ? { group: initialValue } : initialValue } });
    fireEvent.click(document.getElementById(`edit-settings-config-${root}`));
    fireEvent.click(document.getElementById(`remove-settings-config-${arrayPath}-0`));
    await selectOption(userEvent.setup(), 'NoReproduction: No reproduction');
    addSelected();
    fireEvent.click(document.getElementById(`save-settings-config-${root}`));
    const nextValue = { loanConditions: [...legacy, pairs[1]] };
    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(expect.anything(), {
      json: { illConfig: nested ? { group: nextValue } : nextValue },
    }));
  });

  it('still rejects blank strings in new custom entries', async () => {
    renderEditor({ configKey: 'illConfig', fieldMapping: [field] });
    edit();
    fireEvent.click(screen.getByRole('button', { name: 'Add custom' }));
    const code = screen.getByRole('textbox', { name: 'code' });
    const description = screen.getByRole('textbox', { name: 'defaultDesc' });
    fireEvent.change(code, { target: { value: 'New' } });
    fireEvent.click(document.getElementById('add-settings-config-loanConditions'));
    expect(description).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(code, { target: { value: '' } });
    fireEvent.change(description, { target: { value: 'New description' } });
    fireEvent.click(document.getElementById('add-settings-config-loanConditions'));
    expect(code).toHaveAttribute('aria-invalid', 'true');
    save();
    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(expect.anything(), {
      json: { illConfig: { loanConditions: [] } },
    }));
  });

  it('continues validating other children of saved code/description pairs', () => {
    renderEditor({ configKey: 'illConfig',
      fieldMapping: [{ ...field,
        objectMap: [...field.objectMap, { fieldName: 'priority', valueType: 'integer', required: true }] }],
      initialResource: { illConfig: { loanConditions: [{ code: 'Legacy', defaultDesc: '' }] } } });
    edit();
    save();
    expect(mockPatch).not.toHaveBeenCalled();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('validates custom entries and duplicate codes, and restores the draft on Cancel', async () => {
    renderEditor({ configKey: 'illConfig',
      fieldMapping: [field],
      initialResource: { illConfig: { loanConditions: [pairs[0]] } } });
    edit();
    fireEvent.click(screen.getByRole('button', { name: 'Add custom' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'code' }), { target: { value: pairs[0].code } });
    fireEvent.click(document.getElementById('add-settings-config-loanConditions'));
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole('textbox', { name: 'defaultDesc' }), { target: { value: 'New description' } });
    fireEvent.click(document.getElementById('add-settings-config-loanConditions'));
    expect(screen.getByText('The code {code} already exists.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'code' }), { target: { value: 'Custom' } });
    fireEvent.click(document.getElementById('add-settings-config-loanConditions'));
    expect(screen.getByText('New description')).toBeInTheDocument();
    fireEvent.click(document.getElementById('cancel-settings-config-loanConditions'));
    expect(screen.queryByText('New description')).not.toBeInTheDocument();
    edit();
    expect(screen.queryByRole('textbox', { name: 'code' })).not.toBeInTheDocument();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('translates description display and search without changing custom inputs or persisted text', async () => {
    mockMessages = { 'loanConditions.values.LibraryUseOnly': 'Consultation sur place' };
    const user = userEvent.setup();
    renderEditor({ configKey: 'illConfig', fieldMapping: [field] });
    edit();
    await user.type(screen.getByRole('combobox', { name: 'Add predefined' }), 'sur place');
    await user.click(await screen.findByRole('option', { name: (_name, element) => element.textContent.startsWith('LibraryUseOnly: Consultation sur place') }));
    addSelected();
    expect(screen.getByText('Consultation sur place')).toBeInTheDocument();
    expect(screen.getByText('LibraryUseOnly')).toBeInTheDocument();
    save();
    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(expect.anything(), {
      json: { illConfig: { loanConditions: [pairs[0]] } },
    }));
  });

  it('uses field-specific translations for custom codes and plain text fallbacks', () => {
    mockMessages = { 'loanConditions.values.Custom': 'Translated custom', 'other.values.Custom': 'Different field' };
    renderEditor({ configKey: 'illConfig',
      fieldMapping: [field, { ...field, fieldName: 'other' }],
      initialResource: { illConfig: {
        loanConditions: [{ code: 'Custom', defaultDesc: 'Saved custom' }, { code: 'Unknown', defaultDesc: 'Literal {braces}' }],
        other: [{ code: 'Custom', defaultDesc: 'Another saved description' }],
      } } });
    expect(screen.getByText('Translated custom')).toBeInTheDocument();
    expect(screen.getByText('Different field')).toBeInTheDocument();
    expect(screen.getByText('Literal {braces}')).toBeInTheDocument();
    expect(screen.queryByText('Saved custom')).not.toBeInTheDocument();
  });

  it.each([undefined, null])('fails closed for defaultOnly when defaults are unavailable (%s)', defaults => {
    mockOpenApiData = defaults === undefined ? undefined : { components: { schemas: { IllConfig: {
      properties: { loanConditions: { 'x-default-data': defaults } },
    } } } };
    const refetch = jest.fn();
    mockOpenApiState = { refetch, isError: true };
    renderEditor({ configKey: 'illConfig', fieldMapping: [{ ...field, defaultOnly: true }] });
    edit();
    expect(screen.getByText('Predefined entries are unavailable.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add custom' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows loading while retaining unrestricted custom entry and uses valid cached defaults after errors', async () => {
    mockOpenApiData = undefined;
    mockOpenApiState = { isFetching: true };
    const { unmount } = renderEditor({ configKey: 'illConfig', fieldMapping: [field] });
    edit();
    expect(screen.getByText('Loading predefined entries…')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'code' })).toBeInTheDocument();
    unmount();
    mockOpenApiData = spec;
    mockOpenApiState = { isError: true };
    renderEditor({ configKey: 'illConfig', fieldMapping: [{ ...field, defaultOnly: true }] });
    edit();
    await selectOption(userEvent.setup(), 'LibraryUseOnly: Use in library only');
    expect(screen.queryByText('Predefined entries are unavailable.')).not.toBeInTheDocument();
  });

  it('keeps a custom form active when metadata arrives and clears it after Save and Cancel', async () => {
    mockOpenApiData = undefined;
    mockOpenApiState = { isFetching: true };
    const props = { configKey: 'illConfig',
      fieldMapping: [field],
      fieldLabelId: path => path,
      initialResource: { illConfig: {} },
      resourcePath: 'directory/entries/by-id/entry-id' };
    const { rerender } = render(<SettingsConfigEditor {...props} />);
    edit();
    fireEvent.change(screen.getByRole('textbox', { name: 'code' }), { target: { value: 'Draft' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'defaultDesc' }), { target: { value: 'User draft' } });
    mockOpenApiData = spec;
    mockOpenApiState = {};
    rerender(<SettingsConfigEditor {...props} />);
    expect(screen.getByRole('textbox', { name: 'code' })).toHaveValue('Draft');
    expect(screen.getByRole('textbox', { name: 'defaultDesc' })).toHaveValue('User draft');
    fireEvent.click(document.getElementById('add-settings-config-loanConditions'));
    save();
    await waitFor(() => expect(document.getElementById('edit-settings-config-loanConditions')).toBeInTheDocument());
    expect(mockPatch).toHaveBeenCalledWith(expect.anything(), {
      json: { illConfig: { loanConditions: [{ code: 'Draft', defaultDesc: 'User draft' }] } },
    });
    edit();
    expect(screen.queryByRole('textbox', { name: 'code' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add custom' }));
    fireEvent.click(document.getElementById('cancel-settings-config-loanConditions'));
    edit();
    expect(screen.queryByRole('textbox', { name: 'code' })).not.toBeInTheDocument();
  });

  it('gives selected-chip buttons valid, field-scoped labels even when codes contain spaces', async () => {
    const code = 'Shared code/with punctuation';
    const description = 'Description with spaces';
    mockOpenApiData = { components: { schemas: { IllConfig: { properties: {
      loanConditions: { 'x-default-data': { [code]: description } },
      other: { 'x-default-data': { [code]: description } },
    } } } } };
    renderEditor({ configKey: 'illConfig', fieldMapping: [field, { ...field, fieldName: 'other' }] });
    edit();
    fireEvent.click(document.getElementById('edit-settings-config-other'));
    const user = userEvent.setup();
    const inputs = screen.getAllByRole('combobox', { name: 'Add predefined' });
    for (const input of inputs) {
      await user.click(input);
      await user.click(await screen.findByRole('option', { name: name => name.startsWith(`${code}:`) }));
      await user.keyboard('{Escape}');
    }
    const buttons = screen.getAllByRole('button', { name: name => name.includes(`${code}: ${description}`) });
    expect(buttons).toHaveLength(2);
    buttons.forEach(button => {
      const labels = button.getAttribute('aria-labelledby').split(/\s+/);
      expect(labels).toHaveLength(2);
      labels.forEach(id => expect(document.getElementById(id)).toBeInTheDocument());
    });
    expect(buttons[0].getAttribute('aria-labelledby')).not.toEqual(buttons[1].getAttribute('aria-labelledby'));
    await user.click(buttons[0]);
    const addButtons = screen.getAllByRole('button', { name: 'Add selected' });
    expect(addButtons[0]).toBeDisabled();
    expect(addButtons[1]).toBeEnabled();
  });

  it('updates translations without resetting drafts and clears pending selections on entry navigation', async () => {
    const initialResource = { illConfig: { loanConditions: [{ code: 'Custom', defaultDesc: 'Stored description' }] } };
    const props = { configKey: 'illConfig',
      fieldMapping: [field],
      fieldLabelId: path => path,
      initialResource,
      resourcePath: 'directory/entries/by-id/first' };
    mockMessages = { 'loanConditions.values.Custom': 'First language' };
    const { rerender } = render(<SettingsConfigEditor {...props} />);
    edit();
    const user = userEvent.setup();
    await selectOption(user, 'LibraryUseOnly: Use in library only');
    fireEvent.click(screen.getByRole('button', { name: 'Add custom' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'code' }), { target: { value: 'Draft' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'defaultDesc' }), { target: { value: 'Untranslated draft' } });
    mockMessages = { 'loanConditions.values.Custom': 'Second language',
      'loanConditions.values.LibraryUseOnly': 'Translated selection' };
    rerender(<SettingsConfigEditor {...props} />);
    expect(screen.getByText('Second language')).toBeInTheDocument();
    expect(within(document.getElementById('multi-values-list-settings-config-loanConditions-defaults'))
      .getByText('LibraryUseOnly: Translated selection')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'defaultDesc' })).toHaveValue('Untranslated draft');
    expect(screen.getByRole('textbox', { name: 'code' })).toHaveValue('Draft');
    rerender(<SettingsConfigEditor {...props} initialResource={{ illConfig: {} }} resourcePath="directory/entries/by-id/second" />);
    expect(screen.queryByRole('combobox', { name: 'Add predefined' })).not.toBeInTheDocument();
    edit();
    expect(screen.getByRole('button', { name: 'Add selected' })).toBeDisabled();
    expect(screen.queryByRole('textbox', { name: 'code' })).not.toBeInTheDocument();
    expect(screen.queryByText('Second language')).not.toBeInTheDocument();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('translates read-only override descriptions and retains the literal code', () => {
    mockMessages = { 'loanConditions.values.LibraryUseOnly': 'Translated override' };
    renderEditor({ configKey: 'illConfig', fieldMapping: [{ ...field, disabled: true, overrideValue: [pairs[0]] }] });
    expect(screen.getByText('Translated override')).toBeInTheDocument();
    expect(screen.getByText('LibraryUseOnly')).toBeInTheDocument();
    expect(screen.queryByText('Use in library only')).not.toBeInTheDocument();
  });

  it.each([
    { fieldName: 'scalar', defaultOnly: true },
    { fieldName: 'array', valueType: 'objectArray', defaultOnly: true, objectMap: [{ fieldName: 'code' }] },
    { ...field, defaultOnly: 'true' },
  ])('rejects incompatible defaultOnly mappings: $fieldName', invalidField => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderEditor({ fieldMapping: [invalidField] })).toThrow(/defaultOnly/);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('uses nested schema paths and saves through the containing object', async () => {
    mockOpenApiData = { components: { schemas: { IllConfig: { properties: {
      group: { properties: spec.components.schemas.IllConfig.properties },
    } } } } };
    renderEditor({ configKey: 'illConfig', fieldMapping: [{ fieldName: 'group', valueType: 'subField', subMap: [field] }] });
    fireEvent.click(document.getElementById('edit-settings-config-group'));
    await selectOption(userEvent.setup(), 'LibraryUseOnly: Use in library only');
    addSelected();
    fireEvent.click(document.getElementById('save-settings-config-group'));
    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(expect.anything(), {
      json: { illConfig: { group: { loanConditions: [pairs[0]] } } },
    }));
  });
});
