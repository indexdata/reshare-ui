import React from 'react';
import { useQuery } from 'react-query';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from '@folio/stripes/components';
import {
  useCloseDirect,
  useIsActionPending,
  useOkapiKy,
  useOkapiQuery,
  usePerformAction,
} from '@projectreshare/stripes-reshare';
import PdfPane from '#/components/PdfPane';

const PullSlipRoute = ({ match }) => {
  const requestId = match.params?.id;
  const intl = useIntl();
  const okapiKy = useOkapiKy();
  const close = useCloseDirect();
  const performAction = usePerformAction(requestId);
  const actionPending = !!useIsActionPending(requestId);

  const pdfQuery = useQuery({
    queryKey: ['broker/pullslips', requestId],
    queryFn: () => okapiKy.post('broker/pullslips', { json: { illTransactionIds: [requestId] } }).blob(),
    enabled: !!requestId,
    retry: false,
  });

  // Same query as the request view, so usually already cached.
  const { data: actionsData } = useOkapiQuery(
    `broker/patron_requests/${requestId}/actions`,
    { staleTime: 2 * 60 * 1000, enabled: !!requestId, useErrorBoundary: false }
  );
  const canMark = !!actionsData?.actions?.some(a => a.name === 'pullslip-printed');

  const markPrinted = () => performAction('pullslip-printed').then(close, () => {});

  return (
    <PdfPane
      pdfQuery={pdfQuery}
      paneTitle={intl.formatMessage({ id: 'ui-rs.pullSlip' })}
      lastMenu={canMark ? (
        <Button buttonStyle="primary" marginBottom0 disabled={actionPending} onClick={markPrinted}>
          <FormattedMessage id="stripes-reshare.actions.pullslip-printed" />
        </Button>
      ) : undefined}
    />
  );
};

export default PullSlipRoute;
