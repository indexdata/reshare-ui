# SimpleTable

`SimpleTable` renders a short list of records as a native `<table>`: a
handful of columns, no paging, no virtualization, no row click. Column widths
come from the browser's table auto-layout. Wrapping cells can shrink to
accommodate neighbouring columns. Lists that page,
virtualize or need row selection are `MultiColumnList`'s job.

With no rows it renders `EmptyMessage` with `emptyMessage`, or `Loading` while
`loading` is true, in place of the table.

| Prop | Type | Description |
|---|---|---|
| `caption` | node, required | Visually hidden `<caption>`; the table's accessible name. |
| `columns` | array, required | Column definitions in display order, see below. |
| `rows` | array, required | Row objects. |
| `id` | string | Put on the `<table>`. |
| `rowKey` | `(row) => key` | React key per row. Defaults to `row.id`, falling back to the index. |
| `emptyMessage` | node | Shown when `rows` is empty and not loading. |
| `loading` | bool | With no rows, shows `Loading` instead of the empty message. |
| `defaultSortColumn` | string | Key of the column to sort by initially. |

Each column is an object:

| Field | Type | Description |
|---|---|---|
| `key` | string, required | Column identity; also the row property shown when there is no `render`. |
| `label` | node | Header text. `''` gives an empty header cell. |
| `render` | `(row) => node` | Cell content. |
| `sort` | `true` or `(rowA, rowB) => number` | Makes the header a sort button. `true` compares the column's own row value as text, numeric-aware, with blanks first. A function gets whole rows rather than cell values, so it can break ties on other fields, and must order ascending. |
| `defaultDirection` | `'ascending'` or `'descending'` | Direction used when initially sorting by this column or switching back to it. Ascending unless set. |
| `fit` | bool | Keep this column compact and prevent text wrapping. Useful for dates, numbers, and action buttons. Other columns share the remaining width. |

Sorting is the table's own state. Clicking a sortable header sorts by that
column in its `defaultDirection`; clicking the sorted column again reverses it.
The comparator is called for ascending order and negated for descending, so
tie-breakers inside it flip along with the primary key. Sortable headers carry
`aria-sort`.
