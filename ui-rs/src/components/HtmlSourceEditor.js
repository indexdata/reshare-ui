import React, { useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button, Label } from '@folio/stripes/components';
import { Annotation, Compartment, EditorSelection, EditorState, StateEffect, StateField } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  showPanel,
} from '@codemirror/view';
import { defaultKeymap, history, historyField, historyKeymap } from '@codemirror/commands';
import { bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { highlightSelectionMatches, openSearchPanel, searchKeymap } from '@codemirror/search';
import { forceLinting, linter, lintGutter } from '@codemirror/lint';
import { html, htmlLanguage } from '@codemirror/lang-html';

import css from './HtmlSourceEditor.css';

// Avoid reporting form-driven changes back to the form.
const fromForm = Annotation.define();

// Keep external diagnostics in the same lint pass as syntax errors, and move
// their ranges with edits until replaced.
const setExternalDiagnostics = StateEffect.define();
const externalDiagnostics = StateField.define({
  create: () => [],
  update: (value, tr) => {
    const set = tr.effects.find(e => e.is(setExternalDiagnostics));
    if (set) return set.value;
    if (!tr.docChanged) return value;
    return value
      .map(d => ({ ...d, from: tr.changes.mapPos(d.from, 1), to: tr.changes.mapPos(d.to, -1) }))
      .filter(d => d.from <= d.to);
  },
});

// Convert the broker's 1-based character column to a UTF-16 offset.
const columnOffset = (text, column) => {
  let offset = 0;
  let remaining = column - 1;
  for (const ch of text) {
    if (remaining <= 0) break;
    offset += ch.length;
    remaining -= 1;
  }
  return offset;
};

// A Go template action, with its quoted strings, which may hold `}}`.
const ACTION = /\{\{(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`|[^"'`])*?\}\}/g;

// Structural errors in the body's HTML and CSS. The broker reports a dropped quote
// or bracket as a template error without a line, so this is what locates one.
// The HTML grammar knows nothing of Go templates, so the check parses the text with
// every action replaced by spaces of the same length, which keeps the offsets and
// leaves valid HTML wherever an action may sit: a quoted string inside an attribute
// value, a conditional around a style rule, a value inside one. The editor's own
// parse, which highlights the actions, is not used. A closing tag that matches no
// open one is not reported either: a body whose {{if}} and {{else}} each close the
// same element is valid though, with the actions blanked, it closes that element
// twice. Cascading errors are limited to one mark per line and five overall.
const MAX_SYNTAX_MARKS = 5;
const syntaxDiagnostics = (state, message) => {
  const marks = [];
  let lastLine = 0;
  const masked = state.doc.toString().replace(ACTION, action => ' '.repeat(action.length));
  htmlLanguage.parser.parse(masked).iterate({
    enter: (node) => {
      if (marks.length >= MAX_SYNTAX_MARKS) return false;
      if (!node.type.isError) return undefined;
      const line = state.doc.lineAt(node.from);
      if (line.number !== lastLine) {
        lastLine = line.number;
        marks.push({
          from: node.from,
          to: Math.max(node.to, Math.min(node.from + 1, line.to)),
          severity: 'error',
          message,
        });
      }
      return false;
    },
  });
  return marks;
};

// A minimal replacement preserves cursor positions and undo around placeholders.
const changeBetween = (before, after) => {
  const shorter = Math.min(before.length, after.length);
  let from = 0;
  while (from < shorter && before[from] === after[from]) from++;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > from && endAfter > from && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }
  return { from, to: endBefore, insert: after.slice(from, endAfter) };
};

// Let the pane scroll vertically; long lines scroll within the editor.
const theme = EditorView.theme({
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-content, .cm-gutter': { minHeight: '15rem' },
});

// Final-form field. onSelectionChange reports { start, end } offsets, or null on
// unmount. diagnostics is a stable array of { line, column, message } with 1-based
// character coordinates (column defaults to 1). stateRef preserves selection and
// undo history across remounts when the value is unchanged.
const HtmlSourceEditor = ({
  input,
  meta,
  id,
  label,
  required,
  onSelectionChange,
  toolbar,
  editorRef,
  diagnostics,
  stateRef,
}) => {
  const intl = useIntl();
  const parent = useRef(null);
  const [toolbarDom] = useState(() => {
    const dom = document.createElement('div');
    dom.className = css.toolbar;
    return dom;
  });
  const view = useRef(null);
  const attributes = useRef(new Compartment());
  const labelId = useId();
  const error = meta.touched && meta.error ? meta.error : '';

  // The view outlives renders, so its listener reads the current callbacks here.
  const latest = useRef();
  latest.current = { input, onSelectionChange };

  useImperativeHandle(editorRef, () => ({ focus: () => view.current?.focus() }), []);

  const contentAttributes = () => EditorView.contentAttributes.of({
    id,
    'aria-labelledby': labelId,
    ...(required && { 'aria-required': 'true' }),
    ...(error && { 'aria-invalid': 'true', 'aria-describedby': `${labelId}-error` }),
  });

  useEffect(() => {
    const value = latest.current.input.value ?? '';
    const extensions = [
      // Preserve carriage returns so offsets and saved text match the form value.
      EditorState.lineSeparator.of('\n'),
      lineNumbers(),
      lintGutter(),
      externalDiagnostics,
      linter((editor) => [
        ...syntaxDiagnostics(editor.state, intl.formatMessage({ id: 'ui-rs.htmlSourceEditor.lint.syntax' })),
        ...editor.state.field(externalDiagnostics),
      ], {
        delay: 300,
        needsRefresh: update => update.transactions.some(tr => tr.effects.some(e => e.is(setExternalDiagnostics))),
      }),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      html(),
      theme,
      attributes.current.of(contentAttributes()),
      showPanel.of(() => ({ dom: toolbarDom, top: true })),
      EditorView.updateListener.of((update) => {
        const { input: field, onSelectionChange: report } = latest.current;
        if (update.docChanged && !update.transactions.some(tr => tr.annotation(fromForm))) {
          field.onChange(update.state.doc.toString());
        }
        // Tabbing in must establish the insertion point even if selection is unchanged.
        if (update.docChanged || update.selectionSet || (update.focusChanged && update.view.hasFocus)) {
          const { from, to } = update.state.selection.main;
          report?.({ start: from, end: to });
        }
        if (update.focusChanged) {
          if (update.view.hasFocus) field.onFocus();
          else field.onBlur();
        }
      }),
    ];
    // Restore content and history with this instance's listeners and panel.
    const saved = stateRef?.current;
    const resumed = saved?.doc === value;
    const editor = new EditorView({
      parent: parent.current,
      state: resumed
        ? EditorState.fromJSON(saved, { extensions }, { history: historyField })
        : EditorState.create({ doc: value, extensions }),
    });
    view.current = editor;
    if (resumed) {
      const { from, to, head } = editor.state.selection.main;
      editor.dispatch({ effects: EditorView.scrollIntoView(head, { y: 'center' }) });
      latest.current.onSelectionChange?.({ start: from, end: to });
    }
    return () => {
      if (stateRef) stateRef.current = editor.state.toJSON({ history: historyField });
      editor.destroy();
      view.current = null;
      latest.current.onSelectionChange?.(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const editor = view.current;
    const current = editor.state.doc.toString();
    const next = input.value ?? '';
    if (current === next) return;
    const { main } = editor.state.selection;
    // A change that keeps the text either side of the selection is taken as replacing
    // it. The minimal diff would misplace an insert that repeats the text after the
    // cursor, as a placeholder inserted before another one does.
    const before = current.slice(0, main.from);
    const after = current.slice(main.to);
    const replacesSelection = next.length >= before.length + after.length
      && next.startsWith(before) && next.endsWith(after);
    const change = replacesSelection
      ? { from: main.from, to: main.to, insert: next.slice(before.length, next.length - after.length) }
      : changeBetween(current, next);
    const changes = editor.state.changes(change);
    // Collapse a replaced selection after the insert; map other selections normally.
    const touched = main.from <= change.to && main.to >= change.from;
    editor.dispatch({
      changes,
      selection: touched
        ? EditorSelection.cursor(change.from + change.insert.length)
        : editor.state.selection.map(changes, 1),
      annotations: fromForm.of(true),
    });
  }, [input.value]);

  useEffect(() => {
    const editor = view.current;
    const { doc } = editor.state;
    const marks = (diagnostics ?? [])
      .filter(({ line }) => line >= 1 && line <= doc.lines)
      .map(({ line, column = 1, message }) => {
        const { from, to } = doc.line(line);
        return { from: from + columnOffset(doc.sliceString(from, to), column), to, severity: 'error', message };
      });
    editor.dispatch({ effects: setExternalDiagnostics.of(marks) });
    forceLinting(editor);
  }, [diagnostics]);

  useEffect(() => {
    view.current.dispatch({ effects: attributes.current.reconfigure(contentAttributes()) });
  }, [id, labelId, required, error]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {label && (
        <Label id={labelId} required={required}>
          {label}
        </Label>
      )}
      <div ref={parent} className={classNames(css.editor, { [css.hasError]: error })} />
      {createPortal(
        <>
          {toolbar}
          <Button buttonStyle="default slim" marginBottom0 onClick={() => openSearchPanel(view.current)}>
            <FormattedMessage id="ui-rs.htmlSourceEditor.search" />
          </Button>
        </>,
        toolbarDom,
      )}
      <div role="alert">
        {error && <div id={`${labelId}-error`} className={css.error}>{error}</div>}
      </div>
    </div>
  );
};

export default HtmlSourceEditor;
