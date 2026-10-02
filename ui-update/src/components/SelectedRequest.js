import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Headline, KeyValue } from '@folio/stripes/components';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import { CatalogInfo, RequesterSupplier } from '@projectreshare/stripes-reshare/cards';
import { useStripes } from '@folio/stripes/core';

const SelectedRequest = ({ initialRequest, initialRequestTime }) => {
  const stripes = useStripes();
  const q = useOkapiQuery(`rs/patronrequests/${initialRequest.id}`, {
    initialData: initialRequest,
    initialDataUpdatedAt: initialRequestTime,
    staleTime: 2 * 60 * 1000,
  });
  const request = q.data;

  return (
    <>
      <KeyValue label={<FormattedMessage id="stripes-reshare.requestState" />}>
        <Headline size="large" faded><FormattedMessage id={`stripes-reshare.states.${request.state?.code}`} /></Headline>
      </KeyValue>
      <CatalogInfo request={request} stripes={stripes} />
      <RequesterSupplier request={request} />
    </>
  );
};

export default SelectedRequest;
