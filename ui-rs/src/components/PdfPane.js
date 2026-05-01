import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { MessageBanner, Pane, Paneset } from '@folio/stripes/components';
import { useCloseDirect } from '@projectreshare/stripes-reshare';
import parseErrRes from '../util/parseErrRes';

const PdfPane = ({ pdfQuery, ...paneProps }) => {
  const intl = useIntl();
  const close = useCloseDirect();
  const [pdfUrl, setPdfUrl] = useState();
  const [errMsg, setErrMsg] = useState(null);

  useEffect(() => {
    setPdfUrl(undefined);

    if (pdfQuery.isSuccess && pdfQuery.data) {
      const url = URL.createObjectURL(pdfQuery.data);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [pdfQuery.isSuccess, pdfQuery.data]);

  useEffect(() => {
    if (pdfQuery.isError) {
      parseErrRes(pdfQuery.error).then(setErrMsg);
    }
  }, [pdfQuery.isError, pdfQuery.error]);

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
        {pdfUrl && <iframe src={pdfUrl} width="100%" height="100%" title={iframeTitle} />}
      </Pane>
    </Paneset>
  );
};

export default PdfPane;
