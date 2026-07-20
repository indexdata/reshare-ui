import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useLocation, useParams } from 'react-router-dom';
import { Pane } from '@folio/stripes/components';
import { useCloseDirect } from '@projectreshare/stripes-reshare';
import EntryTiersEditor from '../components/EntryTiersEditor';

const EditEntryTiersRoute = () => {
  const { id } = useParams();
  const location = useLocation();
  const close = useCloseDirect(`/rsdir/entries/entry-points/${id}/edit${location.search}`);

  return (
    <Pane
      defaultWidth="fill"
      dismissible
      onClose={close}
      paneTitle={<FormattedMessage id="ui-rsdir.tiers.edit" />}
    >
      <EntryTiersEditor id={id} />
    </Pane>
  );
};

export default EditEntryTiersRoute;
