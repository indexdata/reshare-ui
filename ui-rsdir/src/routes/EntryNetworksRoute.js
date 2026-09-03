import React from 'react';
import { useParams } from 'react-router-dom';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryPane from '../components/EntryPane';
import EntryNetworksEditor from '../components/EntryNetworksEditor';
import EntryOwnedNetworksEditor from '../components/EntryOwnedNetworksEditor';

const EntryNetworksRoute = () => {
  const { id } = useParams();
  const entryQuery = useOkapiQuery(`directory/entries/by-id/${id}`, {
    staleTime: 2 * 60 * 1000,
  });

  if (!entryQuery.isSuccess) return null;

  // A consortium owns its networks; any other entry picks from those on offer.
  const owns = entryQuery.data.type === 'Consortium';

  return (
    <EntryPane entry={entryQuery.data}>
      {owns ? <EntryOwnedNetworksEditor id={id} /> : <EntryNetworksEditor id={id} />}
    </EntryPane>
  );
};

export default EntryNetworksRoute;
