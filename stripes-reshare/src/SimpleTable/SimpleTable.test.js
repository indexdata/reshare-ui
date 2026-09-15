import React from 'react';
import { fireEvent, render, screen, within } from '@folio/jest-config-stripes/testing-library/react';
import SimpleTable from './SimpleTable';

jest.mock('@folio/stripes-components/lib/Icon', () => require('../../testing/iconMock').default);

// currency-codes/data is a CJS array export that jest's interop exposes as a
// namespace object; stripes-components calls .filter() on it at module load.
jest.mock('currency-codes/data', () => ({ filter: () => [] }));

const byStart = (a, b) => a.start.localeCompare(b.start);

const columns = [
  { key: 'start', label: 'Start', sort: byStart, defaultDirection: 'descending', fit: true },
  { key: 'reason', label: 'Reason', sort: true },
  { key: 'actions', label: '', fit: true, render: row => <button type="button">edit {row.id}</button> },
];

const rows = [
  { id: 'a', start: '2026-01-01', reason: 'item 10' },
  { id: 'b', start: '2026-02-01', reason: 'item 9' },
  { id: 'c', start: '2026-03-01' },
];

const renderTable = (props = {}) => render(
  <SimpleTable
    id="things"
    caption="Things"
    columns={columns}
    rows={rows}
    emptyMessage="nothing here"
    {...props}
  />
);

const bodyRows = () => within(screen.getByRole('table').querySelector('tbody')).getAllByRole('row');
const reasons = () => bodyRows().map(row => within(row).getAllByRole('cell')[1].textContent);
const header = name => screen.getByRole('columnheader', { name });

describe('SimpleTable', () => {
  it('renders headers in column order and a row per item, with rendered and plain cells', () => {
    renderTable();
    const table = screen.getByRole('table', { name: 'Things' });
    expect(table).toHaveAttribute('id', 'things');
    expect(within(table).getAllByRole('columnheader').map(th => th.textContent)).toEqual(['Start', 'Reason', '']);
    expect(bodyRows()).toHaveLength(3);
    expect(within(bodyRows()[1]).getByText('item 9')).toBeInTheDocument();
    expect(within(bodyRows()[1]).getByRole('button', { name: 'edit b' })).toBeInTheDocument();
  });

  it('leaves rows in given order and headers plain when nothing is sorted', () => {
    renderTable();
    expect(reasons()).toEqual(['item 10', 'item 9', '']);
    expect(header('Start')).toHaveAttribute('aria-sort', 'none');
    expect(header('')).not.toHaveAttribute('aria-sort');
    expect(within(header('')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('sorts by the default column in its default direction, reverses on repeat, switches columns', () => {
    renderTable({ defaultSortColumn: 'start' });
    expect(reasons()).toEqual(['', 'item 9', 'item 10']);
    expect(header('Start')).toHaveAttribute('aria-sort', 'descending');

    fireEvent.click(within(header('Start')).getByRole('button', { name: 'Start' }));
    expect(reasons()).toEqual(['item 10', 'item 9', '']);
    expect(header('Start')).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.click(within(header('Reason')).getByRole('button', { name: 'Reason' }));
    expect(header('Reason')).toHaveAttribute('aria-sort', 'ascending');
    expect(header('Start')).toHaveAttribute('aria-sort', 'none');
  });

  it('with sort: true, orders by the column value, numeric-aware, blanks first', () => {
    renderTable({ defaultSortColumn: 'reason' });
    expect(reasons()).toEqual(['', 'item 9', 'item 10']);
  });

  it('applies fit to header and body cells', () => {
    renderTable();
    expect(header('Start')).toHaveClass('fit');
    const cells = within(bodyRows()[0]).getAllByRole('cell');
    expect(cells[0]).toHaveClass('fit');
    expect(cells[1]).not.toHaveClass('fit');
  });

  it('shows the empty message instead of a table, and nothing while loading', () => {
    const { rerender } = renderTable({ rows: [] });
    expect(screen.getByText('nothing here')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    rerender(<SimpleTable caption="Things" columns={columns} rows={[]} emptyMessage="nothing here" loading />);
    expect(screen.queryByText('nothing here')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
