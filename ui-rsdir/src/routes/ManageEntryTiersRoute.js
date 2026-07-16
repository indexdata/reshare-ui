import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useLocation, useParams } from 'react-router-dom';
import { Pane } from '@folio/stripes/components';
import { useCloseDirect } from '@projectreshare/stripes-reshare';
import EntryOwnedTiersEditor from '../components/EntryOwnedTiersEditor';

const ManageEntryTiersRoute = () => {
  const { id } = useParams();
  const location = useLocation();
  const close = useCloseDirect(`/rsdir/entries/entry-points/${id}${location.search}`);

  return (
    <Pane
      defaultWidth="fill"
      dismissible
      onClose={close}
      paneTitle={<FormattedMessage id="ui-rsdir.tiers.manage" />}
    >
      <EntryOwnedTiersEditor id={id} />
    </Pane>
  );
};

export default ManageEntryTiersRoute;
