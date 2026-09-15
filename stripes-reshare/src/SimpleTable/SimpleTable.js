import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { EmptyMessage, Icon, Loading } from '@folio/stripes/components';
import css from './SimpleTable.css';

// A native table for short lists. See README.md for the props.
const classes = (...names) => names.filter(Boolean).join(' ');

const cellClass = (col, base) => classes(base, col.fit && css.fit);

const directionOf = col => col?.defaultDirection || 'ascending';

// The default comparator: the column's own value, numeric-aware, blanks first.
const byValue = key => (a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, { numeric: true });

const comparatorOf = col => (col.sort === true ? byValue(col.key) : col.sort);

const SimpleTable = ({
  id,
  caption,
  columns,
  rows,
  rowKey = row => row.id,
  emptyMessage,
  loading = false,
  defaultSortColumn,
}) => {
  const [sort, setSort] = useState(() => ({
    column: defaultSortColumn,
    direction: directionOf(columns.find(col => col.key === defaultSortColumn)),
  }));

  const sortedRows = useMemo(() => {
    const compare = comparatorOf(columns.find(c => c.key === sort.column) || {});
    if (!compare) return rows;
    const sign = sort.direction === 'descending' ? -1 : 1;
    return [...rows].sort((a, b) => sign * compare(a, b));
  }, [rows, columns, sort]);

  if (rows.length === 0) {
    return loading ? <Loading /> : <EmptyMessage>{emptyMessage}</EmptyMessage>;
  }

  const sortBy = col => setSort(prev => ({
    column: col.key,
    direction: prev.column === col.key
      ? (prev.direction === 'ascending' ? 'descending' : 'ascending')
      : directionOf(col),
  }));

  const header = (col) => {
    if (!col.sort) {
      return <th key={col.key} scope="col" className={cellClass(col, css.header)}>{col.label}</th>;
    }
    const sorted = sort.column === col.key;
    return (
      <th
        key={col.key}
        scope="col"
        aria-sort={sorted ? sort.direction : 'none'}
        className={cellClass(col, css.header)}
      >
        <button
          type="button"
          className={classes(css.sortButton, sorted && css.sorted)}
          onClick={() => sortBy(col)}
        >
          {col.label}
          {sorted && <Icon icon={sort.direction === 'ascending' ? 'caret-up' : 'caret-down'} />}
        </button>
      </th>
    );
  };

  return (
    <table id={id} className={css.table}>
      <caption className={css.srOnly}>{caption}</caption>
      <thead>
        <tr className={css.headerRow}>{columns.map(header)}</tr>
      </thead>
      <tbody>
        {sortedRows.map((row, index) => (
          <tr key={rowKey(row) ?? index}>
            {columns.map(col => (
              <td key={col.key} className={cellClass(col, css.cell)}>
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

SimpleTable.propTypes = {
  id: PropTypes.string,
  caption: PropTypes.node.isRequired,
  columns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.node,
    render: PropTypes.func,
    sort: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
    defaultDirection: PropTypes.oneOf(['ascending', 'descending']),
    fit: PropTypes.bool,
  })).isRequired,
  rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  rowKey: PropTypes.func,
  emptyMessage: PropTypes.node,
  loading: PropTypes.bool,
  defaultSortColumn: PropTypes.string,
};

export default SimpleTable;
