import React from 'react';
import { useQuery } from 'react-query';
import { useIntl } from 'react-intl';
import { useOkapiKy } from '@folio/stripes/core';
import PdfPane from '../components/PdfPane';

const PullSlipRoute = ({ match }) => {
  const requestId = match.params?.id;
  const intl = useIntl();
  const okapiKy = useOkapiKy();

  const pdfQuery = useQuery({
    queryKey: ['broker/pullslips', requestId],
    queryFn: () => okapiKy.post('broker/pullslips', { json: { illTransactionIds: [requestId] } }).blob(),
    enabled: !!requestId,
    retry: false,
  });

  return (
    <PdfPane
      pdfQuery={pdfQuery}
      paneTitle={intl.formatMessage({ id: 'ui-rs.pullSlip' })}
    />
  );
};

export default PullSlipRoute;
