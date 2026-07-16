import React from 'react';
import { useParams } from 'react-router-dom';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EditEntryTiersRoute from './EditEntryTiersRoute';
import ManageEntryTiersRoute from './ManageEntryTiersRoute';

const EntryPointTiersRoute = () => {
  const { id } = useParams();
  const entryQuery = useOkapiQuery(`rsdir/entries/by-id/${id}`, {
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  if (!entryQuery.isSuccess) return null;

  return entryQuery.data?.type === 'Consortium'
    ? <ManageEntryTiersRoute />
    : <EditEntryTiersRoute />;
};

export default EntryPointTiersRoute;
