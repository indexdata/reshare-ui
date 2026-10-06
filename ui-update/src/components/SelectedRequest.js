import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Headline, KeyValue } from '@folio/stripes/components';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import ItemCard from './ItemCard';
import RequesterSupplier from './RequesterSupplier';

const SelectedRequest = ({ initialRequest }) => {
  const { data: request } = useOkapiQuery(`broker/patron_requests/${initialRequest.id}`, {
    initialData: initialRequest,
    useErrorBoundary: false,
  });

  return (
    <>
      <KeyValue label={<FormattedMessage id="ui-update.state" />}>
        <Headline size="large" faded>
          {request.state ? <FormattedMessage id={`stripes-reshare.states.${request.state}`} defaultMessage={request.state} /> : ''}
        </Headline>
      </KeyValue>
      <RequesterSupplier request={request} />
      <ItemCard request={request} />
    </>
  );
};

export default SelectedRequest;
