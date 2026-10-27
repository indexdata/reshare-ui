import React from 'react';
import { IntlProvider } from 'react-intl';
import { act, fireEvent, render } from '@folio/jest-config-stripes/testing-library/react';
import { EditorView } from '@codemirror/view';
import { forEachDiagnostic, forceLinting } from '@codemirror/lint';
import { undo, undoDepth } from '@codemirror/commands';
import { ignoreMissingTranslations } from '@projectreshare/stripes-reshare/testing/renderWithRs';

import HtmlSourceEditor from './HtmlSourceEditor';

// Keep Intl mounted across rerenders; drive CodeMirror through its API in jsdom.
const IntlShell = ({ children }) => (
  <IntlProvider locale="en" messages={{}} onError={ignoreMissingTranslations}>{children}</IntlProvider>
);

const renderEditor = (value, props = {}) => {
  const input = { name: 'body', value, onChange: jest.fn(), onFocus: jest.fn(), onBlur: jest.fn() };
  const onSelectionChange = jest.fn();
  const rendered = render(
    <HtmlSourceEditor input={input} meta={{}} id="body" label="Body" onSelectionChange={onSelectionChange} {...props} />,
    { wrapper: IntlShell },
  );
  const view = EditorView.findFromDOM(rendered.container.querySelector('.cm-editor'));
  const rerender = (next) => rendered.rerender(
    <HtmlSourceEditor
      input={{ ...input, value: next }}
      meta={{}}
      id="body"
      label="Body"
      onSelectionChange={onSelectionChange}
      {...props}
    />,
  );
  return { ...rendered, view, input, onSelectionChange, rerender };
};

const lint = async (view) => {
  await act(async () => {
    forceLinting(view);
    await new Promise(resolve => { setTimeout(resolve, 0); });
  });
  const marks = [];
  forEachDiagnostic(view.state, (d, from, to) => marks.push({ from, to, message: d.message }));
  return marks;
};

describe('HtmlSourceEditor', () => {
  it('reports typing to the form', () => {
    const { view, input } = renderEditor('<p>Hi</p>');

    act(() => view.dispatch({ changes: { from: 5, insert: '!' }, userEvent: 'input.type' }));

    expect(input.onChange).toHaveBeenCalledWith('<p>Hi!</p>');
  });

  it('reports where the cursor is', () => {
    const { view, onSelectionChange } = renderEditor('<p>Hi</p>');

    act(() => view.dispatch({ selection: { anchor: 3, head: 5 } }));

    expect(onSelectionChange).toHaveBeenLastCalledWith({ start: 3, end: 5 });
  });

  it('takes a change from the form without reporting it back, leaving a cursor after what replaced the selection', () => {
    const { view, input, onSelectionChange, rerender } = renderEditor('<p>Title</p>');
    act(() => view.dispatch({ selection: { anchor: 3, head: 8 } }));

    rerender('<p>{{.Title}}</p>');

    expect(view.state.doc.toString()).toBe('<p>{{.Title}}</p>');
    expect(input.onChange).not.toHaveBeenCalled();
    expect(onSelectionChange).toHaveBeenLastCalledWith({ start: 13, end: 13 });
  });

  it('keeps carriage returns, so offsets match the stored body', () => {
    const { view } = renderEditor('<p>\r\nHi</p>');

    expect(view.state.doc.toString()).toBe('<p>\r\nHi</p>');
  });

  it('focuses with its cursor where it was, through editorRef', () => {
    const editorRef = React.createRef();
    const { view, rerender } = renderEditor('<p></p>', { editorRef });
    act(() => view.dispatch({ selection: { anchor: 3 } }));
    rerender('<p>{{.Title}}</p>');

    act(() => editorRef.current.focus());

    expect(view.hasFocus).toBe(true);
    expect(view.state.selection.main.head).toBe(13);
  });

  it('clears the reported selection on unmount', () => {
    const { unmount, onSelectionChange } = renderEditor('<p>Hi</p>');

    unmount();

    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
  });

  it('offers toolbar actions and opens search', () => {
    const { container, getByRole } = renderEditor('<p>Hi</p>', { toolbar: <button type="button">Insert</button> });

    expect(getByRole('button', { name: 'Insert' })).toBeVisible();
    fireEvent.click(getByRole('button', { name: 'ui-rs.htmlSourceEditor.search' }));

    expect(container.querySelector('.cm-search')).toBeInTheDocument();
  });

  it('marks a diagnostic from its column to the end of its line', async () => {
    const diagnostics = [{ line: 2, column: 4, message: 'unknown field Nope' }];
    const { view } = renderEditor('<p>\n<b>{{.Nope}}</b>\n</p>', { diagnostics });

    expect(await lint(view)).toEqual([{ from: 7, to: 20, message: 'unknown field Nope' }]);
  });

  it('counts a column in characters, not UTF-16 units', async () => {
    const diagnostics = [{ line: 1, column: 5, message: 'unknown field Nope' }];
    const { view } = renderEditor('<p>😀{{.Nope}}</p>', { diagnostics });

    expect(await lint(view)).toEqual([{ from: 5, to: 18, message: 'unknown field Nope' }]);
  });

  it('moves an outside diagnostic with edits until it is replaced', async () => {
    const diagnostics = [{ line: 2, column: 4, message: 'unknown field Nope' }];
    const { view } = renderEditor('<p>\n<b>{{.Nope}}</b>\n</p>', { diagnostics });
    await lint(view);

    act(() => view.dispatch({ changes: { from: 0, insert: '\n' } }));

    expect(await lint(view)).toEqual([{ from: 8, to: 21, message: 'unknown field Nope' }]);
  });

  it('marks HTML it cannot parse, once per line', async () => {
    const { view } = renderEditor('<div class=box">\n<p>y</p>\n<x y="');

    const marks = await lint(view);
    expect(marks.map(m => view.state.doc.lineAt(m.from).number)).toEqual([1, 3]);
    expect(marks.map(m => m.message)).toEqual(['ui-rs.htmlSourceEditor.lint.syntax', 'ui-rs.htmlSourceEditor.lint.syntax']);
  });

  it('reads template actions as part of the markup they sit in', async () => {
    const { view } = renderEditor([
      '<p title="{{printf "%s" .Title}}">{{.Title}}</p>',
      '<p>{{if .Title}}Title</p>{{else}}No title</p>{{end}}',
      '<style>{{if .X}}.a { color: {{.C}} }{{end}}</style>',
      '<td style="{{if .X}}color:red{{end}}">{{printf "}}"}}</td>',
    ].join('\n'));

    expect(await lint(view)).toEqual([]);
  });

  describe('across a remount with the same stateRef', () => {
    it('keeps its cursor and undo history', () => {
      const stateRef = React.createRef();
      const first = renderEditor('<p>Hi</p>', { stateRef });
      act(() => first.view.dispatch({ changes: { from: 5, insert: '!' }, selection: { anchor: 6 }, userEvent: 'input.type' }));
      first.unmount();

      const second = renderEditor('<p>Hi!</p>', { stateRef });

      expect(second.view.state.selection.main.head).toBe(6);
      expect(second.onSelectionChange).toHaveBeenLastCalledWith({ start: 6, end: 6 });
      act(() => { undo(second.view); });
      expect(second.view.state.doc.toString()).toBe('<p>Hi</p>');
    });

    it('starts afresh when the value changed while it was away', () => {
      const stateRef = React.createRef();
      const first = renderEditor('<p>Hi</p>', { stateRef });
      act(() => first.view.dispatch({ changes: { from: 5, insert: '!' }, userEvent: 'input.type' }));
      first.unmount();

      const second = renderEditor('<p>Bye</p>', { stateRef });

      expect(second.view.state.doc.toString()).toBe('<p>Bye</p>');
      expect(undoDepth(second.view.state)).toBe(0);
    });
  });

  it('shows a validation error once the field is touched', () => {
    const { getByRole, container } = renderEditor('', { meta: { touched: true, error: 'Required' } });

    expect(getByRole('alert')).toHaveTextContent('Required');
    expect(container.querySelector('.cm-content')).toHaveAttribute('aria-invalid', 'true');
  });
});
