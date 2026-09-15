import React from 'react';
import { useParams } from 'react-router-dom';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryPane, { EntryLoadingPane } from '../components/EntryPane';
import EntryClosuresEditor from '../components/EntryClosuresEditor';

const ClosuresRoute = () => {
  const { id } = useParams();
  const entryQuery = useOkapiQuery(`directory/entries/by-id/${id}`, {
    staleTime: 2 * 60 * 1000,
  });

  if (!entryQuery.isSuccess) return <EntryLoadingPane />;

  return (
    <EntryPane entry={entryQuery.data}>
      <EntryClosuresEditor id={id} />
    </EntryPane>
  );
};

export default ClosuresRoute;
