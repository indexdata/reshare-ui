import React, { useContext } from 'react';
import { useQuery } from 'react-query';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { useOkapiKy } from '@folio/stripes/core';
import { MessageBanner, Pane, Paneset } from '@folio/stripes/components';
import { useCloseDirect } from '@projectreshare/stripes-reshare';
import AppNameContext from '../AppNameContext';
import PdfPane from '../components/PdfPane';
import { buildPatronRequestsCql } from '../util/buildPatronRequestsCql';

const PullSlipsRoute = () => {
  const appName = useContext(AppNameContext);
  const location = useLocation();
  const intl = useIntl();
  const okapiKy = useOkapiKy();
  const close = useCloseDirect();
  const title = intl.formatMessage({ id: 'ui-rs.pullSlips' });

  const cql = buildPatronRequestsCql(location);
  const side = appName === 'supply' ? 'lending' : 'borrowing';
  const urlParams = queryString.parse(location.search);
  const hasFilter = Boolean(urlParams.query || urlParams.filters);

  const pdfQuery = useQuery({
    queryKey: ['broker/pullslips', cql, side],
    queryFn: () => okapiKy.post('broker/pullslips', {
      json: { cql },
      searchParams: { side },
    }).blob(),
    enabled: hasFilter,
    retry: false,
  });

  if (!hasFilter) {
    return (
      <Paneset>
        <Pane defaultWidth="100%" onClose={close} dismissible paneTitle={title}>
          <MessageBanner type="error">
            {intl.formatMessage({ id: 'ui-rs.pullSlip.noFilter' })}
          </MessageBanner>
        </Pane>
      </Paneset>
    );
  }

  return <PdfPane pdfQuery={pdfQuery} paneTitle={title} />;
};

export default PullSlipsRoute;
