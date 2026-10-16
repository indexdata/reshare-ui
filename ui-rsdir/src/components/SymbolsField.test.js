import React from 'react';
// Provided by the shared Stripes test environment.
// eslint-disable-next-line import/no-extraneous-dependencies
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Form } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import SymbolsField from './SymbolsField';
import { apiSymbolsToFormSymbols } from '../util/symbolAdapter';
import translations from '../../translations/ui-rsdir/en';

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);

jest.mock('@folio/stripes/components', () => {
  const Container = ({ children }) => <div>{children}</div>;

  return {
    Card: Container,
    Col: Container,
    Row: Container,
    IconButton: () => null,
    Button: ({ children, onClick }) => <button type="button" onClick={onClick}>{children}</button>,
    TextField: jest.requireActual('@folio/stripes-components/lib/TextField').default,
  };
});

const messages = {
  ...Object.fromEntries(
    Object.entries(translations).map(([key, value]) => [`ui-rsdir.${key}`, value])
  ),
  'stripes-components.fieldHasError': 'This field has an error',
};

describe('adding a Symbol with a conflicting Authority', () => {
  it.each([
    ['ISIL', false],
    ['isil', false],
    ['  IsIl  ', false],
    ['ISIL', true],
    ['isil', true],
    ['  IsIl  ', true],
  ])('rejects Authority %j and prevents submission (refresh: %p)', (authority, refresh) => {
    const onSubmit = jest.fn();
    const editor = initialValues => (
      <IntlProvider locale="en" messages={messages}>
        <Form
          initialValues={initialValues}
          mutators={arrayMutators}
          onSubmit={onSubmit}
          keepDirtyOnReinitialize
        >
          {({ handleSubmit, invalid }) => (
            <form onSubmit={handleSubmit} aria-label="Entry">
              <SymbolsField />
              <button type="submit" disabled={invalid}>Save</button>
            </form>
          )}
        </Form>
      </IntlProvider>
    );
    const { rerender } = render(editor({
      symbols: apiSymbolsToFormSymbols([{ id: 'existing-symbol', authority: 'ISIL', symbol: 'EXISTING' }]),
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Add symbol' }));
    const newAuthority = screen.getAllByRole('textbox', { name: /Authority/ })[1];
    const newSymbol = screen.getAllByRole('textbox', { name: /Symbol/ })[1];

    fireEvent.change(newSymbol, { target: { value: 'NEW' } });
    fireEvent.change(newAuthority, { target: { value: authority } });
    fireEvent.blur(newAuthority);

    if (refresh) {
      rerender(editor({
        symbols: apiSymbolsToFormSymbols([{ id: 'existing-symbol', authority: 'ISIL', symbol: 'UPDATED' }]),
      }));
    }

    expect(screen.getByText(
      'A single Entry may not be associated with two Symbols that share the same Authority value'
    ).closest('[role="alert"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' }).disabled).toBe(true);
    fireEvent.submit(screen.getByRole('form', { name: 'Entry' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
