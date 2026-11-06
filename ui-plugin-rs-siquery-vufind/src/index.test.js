import React from 'react';
import { fireEvent, screen, waitFor, within } from '@folio/jest-config-stripes/testing-library/react';
import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import ky from 'ky';
import { quietQueryLog } from '@projectreshare/stripes-reshare/testing/quietQueryLog';
import PluginRsSIQueryVufind from '.';

jest.mock('ky', () => jest.fn());
jest.mock('@folio/stripes/core', () => require('@projectreshare/stripes-reshare/testing/stripesCore').makeStripesCoreMock(() => null));
jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);

const record = {
  id: 'rec-1',
  title: 'Cats, cats, & cats',
  authors: { primary: { 'Rice, Edward': [] }, secondary: [], corporate: [] },
  formats: ['Book'],
  physicalDescriptions: ['128 p.'],
};

describe('PluginRsSIQueryVufind', () => {
  quietQueryLog(/^Request failed with status code 502$/);

  beforeEach(() => {
    ky.mockReset().mockReturnValue({ json: () => Promise.resolve({ resultCount: 1, records: [record] }) });
  });

  const search = (dialog, term) => {
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'Title' } });
    fireEvent.change(within(dialog).getByRole('searchbox'), { target: { value: term } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'stripes-smart-components.search' }));
  };

  const openAndSearch = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Search shared catalog' }));
    const dialog = screen.getByRole('dialog');
    search(dialog, 'cats');
    return dialog;
  };

  it('searches VuFind and hands the picked record id to selectInstance', async () => {
    const selectInstance = jest.fn();
    renderWithRs(
      <PluginRsSIQueryVufind
        endpoint="https://vufind.example"
        searchLabel="Search shared catalog"
        selectInstance={selectInstance}
      />
    );

    const dialog = openAndSearch();

    fireEvent.click(await within(dialog).findByText('Cats, cats, & cats'));

    expect(selectInstance).toHaveBeenCalledWith('rec-1');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(ky).toHaveBeenCalledTimes(1);
    const [url, { searchParams }] = ky.mock.calls[0];
    expect(url).toBe('https://vufind.example/api/v1/search');
    expect(searchParams.toString()).toBe(new URLSearchParams([
      ['lookfor', 'cats'],
      ['type', 'Title'],
      ...['id', 'title', 'authors', 'edition', 'formats', 'physicalDescriptions'].map(f => ['field[]', f]),
      ['page', '1'],
      ['limit', '60'],
    ]).toString());
  });

  it('pages through results by VuFind page number, and Reset all clears the search', async () => {
    // One record per page, titled by the page it was fetched as.
    ky.mockImplementation((_url, { searchParams }) => {
      const page = searchParams.get('page');
      return { json: () => Promise.resolve({ resultCount: 120, records: [{ ...record, id: `rec-${page}`, title: `Page ${page}` }] }) };
    });
    renderWithRs(
      <PluginRsSIQueryVufind
        endpoint="https://vufind.example"
        searchLabel="Search shared catalog"
        selectInstance={jest.fn()}
      />
    );

    const dialog = openAndSearch();
    await within(dialog).findByText('Page 1');
    const page = async (label, expected) => {
      fireEvent.click(within(dialog).getByText(label).closest('button'));
      expect(await within(dialog).findByText(expected)).toBeInTheDocument();
    };
    await page('stripes-components.next', 'Page 2');
    await page('stripes-components.previous', 'Page 1');
    await page('stripes-components.next', 'Page 2');
    expect(ky.mock.calls.map(([, { searchParams }]) => searchParams.get('page'))).toEqual(['1', '2']);

    fireEvent.click(within(dialog).getByText('stripes-smart-components.resetAll').closest('button'));
    await waitFor(() => expect(within(dialog).queryByText('Page 2')).not.toBeInTheDocument());
    expect(within(dialog).getByRole('searchbox')).toHaveValue('');
    expect(within(dialog).getByRole('combobox')).toHaveValue('AllFields');
    expect(ky).toHaveBeenCalledTimes(2);
  });

  it('shows a failed search in the modal and retries it from there', async () => {
    ky.mockReturnValueOnce({ json: () => Promise.reject(new Error('Request failed with status code 502')) });
    renderWithRs(
      <PluginRsSIQueryVufind
        endpoint="https://vufind.example"
        searchLabel="Search shared catalog"
        selectInstance={jest.fn()}
      />
    );

    const dialog = openAndSearch();

    expect(await within(dialog).findByText('ui-plugin-rs-siquery-vufind.queryError')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /refresh/i }));

    expect(await within(dialog).findByText('Cats, cats, & cats')).toBeInTheDocument();
    expect(within(dialog).queryByText('ui-plugin-rs-siquery-vufind.queryError')).not.toBeInTheDocument();
    expect(ky).toHaveBeenCalledTimes(2);
  });
});
