import React, { useMemo, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button, Layer, MessageBanner, Pane, PaneMenu, Paneset } from '@folio/stripes/components';

import PdfFrame from '#/components/PdfFrame';
import { PREVIEW_DELAY, useTemplatePreview } from './templatePreview';
import css from './TemplateForm.css';

export const PreviewError = ({ error }) => {
  const intl = useIntl();
  let text = error.line
    ? intl.formatMessage({ id: 'ui-rs.settings.templates.preview.errorLine' }, { line: error.line, message: error.message })
    : error.message;
  if (error.sample) {
    text = intl.formatMessage({ id: 'ui-rs.settings.templates.preview.errorSample' }, { sample: error.sample, error: text });
  }
  return text;
};

// Requires a Stripes Paneset ancestor; editor and footer belong to the parent form.
const PreviewWorkspace = ({ open, values, title, footer, onClose, afterClose, renderEditor }) => {
  const intl = useIntl();
  const heading = intl.formatMessage({ id: 'ui-rs.settings.templates.preview.heading' });

  return (
    <Layer isOpen={open} inRootSet contentLabel={heading} afterClose={afterClose}>
      <Workspace values={values} title={title} footer={footer} onClose={onClose} renderEditor={renderEditor} heading={heading} />
    </Layer>
  );
};

// Split out so the preview is only requested while the layer is open.
const Workspace = ({ values, title, footer, onClose, renderEditor, heading }) => {
  const intl = useIntl();
  const body = values.body ?? '';
  const preview = useTemplatePreview({ body, labels: values.labels }, { delay: PREVIEW_DELAY });
  const { error } = preview;

  const errorText = error ? <PreviewError error={error} /> : null;

  // Marked once per error, and only while the editor still holds the body that
  // failed; CodeMirror then moves the mark along with later edits.
  const bodyRef = useRef(body);
  bodyRef.current = body;
  const diagnostics = useMemo(() => {
    if (!error?.rejected || !error.line || error.body !== bodyRef.current) return [];
    const message = error.sample
      ? intl.formatMessage({ id: 'ui-rs.settings.templates.preview.errorSample' }, { sample: error.sample, error: error.message })
      : error.message;
    return [{ line: error.line, column: error.column, message }];
  }, [error, intl]);

  return (
    <Paneset isRoot>
      <Pane
        id="template-preview-pdf"
        defaultWidth="50%"
        paneTitle={heading}
        paneSub={(
          <FormattedMessage
            id={preview.isFetching ? 'ui-rs.settings.templates.preview.updating' : 'ui-rs.settings.templates.preview.samples'}
          />
        )}
        dismissible
        onClose={onClose}
        lastMenu={(
          <PaneMenu>
            <Button id="template-preview-refresh" buttonStyle="primary" marginBottom0 onClick={preview.refresh}>
              <FormattedMessage id="ui-rs.settings.templates.preview.refresh" />
            </Button>
          </PaneMenu>
        )}
      >
        <div className={css.preview}>
          {errorText && <MessageBanner type="error">{errorText}</MessageBanner>}
          <div className={css.previewFrame}>
            <PdfFrame pdf={preview.pdf} title={heading} thumbnails={false} />
          </div>
        </div>
      </Pane>
      <Pane
        id="template-preview-editor"
        defaultWidth="fill"
        paneTitle={title}
        footer={footer}
      >
        {renderEditor(diagnostics)}
      </Pane>
    </Paneset>
  );
};

export default PreviewWorkspace;
