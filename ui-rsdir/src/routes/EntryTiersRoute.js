import React from 'react';
import { useParams } from 'react-router-dom';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryPane from '../components/EntryPane';
import EntryOwnedTiersEditor from '../components/EntryOwnedTiersEditor';
import EntryTiersEditor from '../components/EntryTiersEditor';

const EntryTiersRoute = () => {
  const { id } = useParams();
  const entryQuery = useOkapiQuery(`directory/entries/by-id/${id}`, {
    staleTime: 2 * 60 * 1000,
  });

  if (!entryQuery.isSuccess) return null;

  // A consortium owns its tiers; any other entry picks from those on offer.
  const owns = entryQuery.data.type === 'Consortium';

  return (
    <EntryPane entry={entryQuery.data}>
      {owns ? <EntryOwnedTiersEditor id={id} /> : <EntryTiersEditor id={id} />}
    </EntryPane>
  );
};

export default EntryTiersRoute;
