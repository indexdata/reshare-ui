import React from 'react';

// Form-test stand-in. To report a cursor position, call setSelectionRange then
// dispatch a native select event. CodeMirror itself is tested separately.
const HtmlSourceEditor = ({ input = {}, id, label, onSelectionChange, toolbar, editorRef }) => {
  const textarea = React.useRef(null);
  React.useImperativeHandle(editorRef, () => ({ focus: () => textarea.current.focus() }), []);
  const report = React.useRef();
  report.current = () => onSelectionChange?.({
    start: textarea.current.selectionStart,
    end: textarea.current.selectionEnd,
  });

  React.useEffect(() => {
    const element = textarea.current;
    const onSelect = () => report.current();
    element.addEventListener('select', onSelect);
    return () => {
      element.removeEventListener('select', onSelect);
      onSelectionChange?.(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {toolbar}
      <textarea
        ref={textarea}
        id={id}
        name={input.name}
        aria-label={typeof label === 'string' ? label : undefined}
        value={input.value ?? ''}
        onChange={(e) => {
          input.onChange(e.target.value);
          report.current();
        }}
        onBlur={input.onBlur}
        onFocus={input.onFocus}
      />
    </>
  );
};

export default HtmlSourceEditor;
