import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useLocation, useParams } from 'react-router-dom';
import { Pane } from '@folio/stripes/components';
import { useCloseDirect } from '@projectreshare/stripes-reshare';
import EntryNetworksEditor from '../components/EntryNetworksEditor';

const EditEntryNetworksRoute = () => {
  const { id } = useParams();
  const location = useLocation();
  const close = useCloseDirect(`/rsdir/entries/entry-points/${id}/edit${location.search}`);

  return (
    <Pane
      defaultWidth="fill"
      dismissible
      onClose={close}
      paneTitle={<FormattedMessage id="ui-rsdir.networks.edit" />}
    >
      <EntryNetworksEditor id={id} />
    </Pane>
  );
};

export default EditEntryNetworksRoute;
