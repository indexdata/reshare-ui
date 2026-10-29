import React from 'react';
import { useIntl } from 'react-intl';
import { MessageBanner, Pane, Paneset } from '@folio/stripes/components';
import { useCloseDirect } from '@projectreshare/stripes-reshare';

import PdfFrame from './PdfFrame';

const PdfPane = ({ pdfQuery, ...paneProps }) => {
  const intl = useIntl();
  const close = useCloseDirect();

  const errMsg = pdfQuery.error?.message ?? null;

  const iframeTitle = typeof paneProps.paneTitle === 'string'
    ? paneProps.paneTitle
    : intl.formatMessage({ id: 'ui-rs.pullSlip' });

  return (
    <Paneset>
      <Pane
        defaultWidth="100%"
        onClose={close}
        dismissible
        {...paneProps}
      >
        {pdfQuery.isError && errMsg && (
          <MessageBanner type="error">
            {intl.formatMessage({ id: 'ui-rs.pullSlip.error' }, { errMsg })}
          </MessageBanner>
        )}
        <PdfFrame pdf={pdfQuery.isSuccess ? pdfQuery.data : undefined} title={iframeTitle} />
      </Pane>
    </Paneset>
  );
};

export default PdfPane;
