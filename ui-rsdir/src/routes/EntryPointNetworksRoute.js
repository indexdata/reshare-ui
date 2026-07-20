import React from 'react';
import { useParams } from 'react-router-dom';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EditEntryNetworksRoute from './EditEntryNetworksRoute';
import ManageEntryNetworksRoute from './ManageEntryNetworksRoute';

const EntryPointNetworksRoute = () => {
  const { id } = useParams();
  const entryQuery = useOkapiQuery(`rsdir/entries/by-id/${id}`, {
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  if (!entryQuery.isSuccess) return null;

  return entryQuery.data?.type === 'Consortium'
    ? <ManageEntryNetworksRoute />
    : <EditEntryNetworksRoute />;
};

export default EntryPointNetworksRoute;
