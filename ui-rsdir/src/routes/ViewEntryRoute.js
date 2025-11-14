import React from 'react';
import { useParams } from 'react-router-dom';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import ViewEntry from '../components/ViewEntry';

const ViewEntryRoute = () => {
  const { id } = useParams();

  const entryQuery = useOkapiQuery(`rsdir/entries/by-id/${id}`, {
    staleTime: 2 * 60 * 1000,
    cacheTime: 8 * 60 * 60 * 1000,
    keepPreviousData: true,
  });

  if (!entryQuery.isSuccess) return null;

  return <ViewEntry entry={entryQuery.data} />;
};

export default ViewEntryRoute;
