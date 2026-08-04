import React from 'react';

// Stripes' Editor wraps react-quill, which does not survive jsdom. Swap in a
// textarea so a form holding an HTML template can render at all. Mock the deep
// path, like textAreaMock — internal stripes imports bypass the barrel:
//   jest.mock('@folio/stripes-components/lib/Editor', () => require('../test/editorMock').default);
// That path is the formField-wrapped export, so the stub gets final-form's
// `input`/`meta` and wires the handlers itself.
//
// This exists so tests can run, not so they can assert on the editor: anything it
// appears to prove about rich text is a property of this stub.
// react-quill also fires changes nobody typed (its own re-parse, source `api`), and
// no DOM event can produce one. Rather than have the stub imitate Quill, it hands the
// current handler back so a test can call it with the arguments react-quill documents.
export const lastEditor = { onChange: null };

const Editor = ({ input = {}, id, label, value, readOnly, onChange }) => {
  lastEditor.onChange = onChange ?? ((html) => input.onChange(html));
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
