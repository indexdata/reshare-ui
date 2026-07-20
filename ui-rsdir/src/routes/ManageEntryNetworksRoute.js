import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useLocation, useParams } from 'react-router-dom';
import { Pane } from '@folio/stripes/components';
import { useCloseDirect } from '@projectreshare/stripes-reshare';
import EntryOwnedNetworksEditor from '../components/EntryOwnedNetworksEditor';

const ManageEntryNetworksRoute = () => {
  const { id } = useParams();
  const location = useLocation();
  const close = useCloseDirect(`/rsdir/entries/entry-points/${id}${location.search}`);

  return (
    <Pane
      defaultWidth="fill"
      dismissible
      onClose={close}
      paneTitle={<FormattedMessage id="ui-rsdir.networks.manage" />}
    >
      <EntryOwnedNetworksEditor id={id} />
    </Pane>
  );
};

export default ManageEntryNetworksRoute;
