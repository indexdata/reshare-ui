import React from 'react';

// Stripes' Editor wraps react-quill, which does not survive jsdom. Swap in a
// textarea so a form holding an HTML template can render at all. Mock the deep
// path, like textAreaMock — internal stripes imports bypass the barrel:
//   jest.mock('@folio/stripes-components/lib/Editor', () => require('../test/editorMock').default);
// That path is the formField-wrapped export, so the stub gets final-form's
// `input`/`meta` and wires the handlers itself.
//
// react-quill also fires changes and selection events no DOM event can reproduce in
// jsdom. The stub exposes the small Quill API surface the form uses so tests exercise
// that boundary while keeping the editor's own rendering out of scope.
export const lastEditor = {
  onChange: null,
  selection: null,
  setSelection(index, length = 0) {
    this.selection = { index, length };
    this.onChangeSelection?.(this.selection);
  },
  blur() {
    this.selection = null;
    this.onChangeSelection?.(null);
  },
};

const Editor = ({ input = {}, id, label, value, readOnly, onChange, onChangeSelection, editorRef }) => {
  lastEditor.onChange = onChange ?? ((html) => input.onChange(html));
  lastEditor.onChangeSelection = onChangeSelection;
  lastEditor.value = input.value ?? value ?? '';

  const editorInstance = React.useRef();
  if (!editorInstance.current) {
    const quill = {
      getSelection: () => lastEditor.selection,
      getLength: () => lastEditor.value.replace(/<[^>]*>/g, '').length + 1,
      updateContents: ({ ops }, source) => {
        const retain = ops.find(op => op.retain)?.retain ?? 0;
        const remove = ops.find(op => op.delete)?.delete ?? 0;
        const insert = ops.find(op => op.insert)?.insert ?? '';
        const paragraph = lastEditor.value.match(/^<p>(.*)<\/p>$/s);
        const text = paragraph ? paragraph[1] : lastEditor.value;
        const nextText = `${text.slice(0, retain)}${insert}${text.slice(retain + remove)}`;
        const nextValue = paragraph ? `<p>${nextText}</p>` : nextText;
        lastEditor.value = nextValue;
        lastEditor.onChange(nextValue, null, source);
      },
      setSelection: (index, length = 0) => lastEditor.setSelection(index, length),
      focus: () => document.getElementById(id)?.focus(),
    };
    editorInstance.current = { getEditor: () => quill };
  }
  React.useEffect(() => {
    const handle = editorInstance.current;
    if (typeof editorRef === 'function') {
      editorRef(handle);
      return () => editorRef(null);
    }
    if (editorRef) {
      editorRef.current = handle;
      return () => {
        if (editorRef.current === handle) editorRef.current = null;
      };
    }
    return undefined;
  }, [editorRef]);

  return (
    <textarea
      id={id}
      name={input.name}
      aria-label={typeof label === 'string' ? label : undefined}
      readOnly={readOnly}
      value={input.value ?? value ?? ''}
      // react-quill reports (html, delta, source), and an overriding onChange may
      // depend on `source` to tell typing from Quill's own re-parsing.
      onChange={e => (onChange ? onChange(e.target.value, null, 'user') : input.onChange(e))}
      onBlur={input.onBlur}
      onFocus={input.onFocus}
    />
  );
};

export default Editor;
