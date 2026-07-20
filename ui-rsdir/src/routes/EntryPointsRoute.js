import React from 'react';
import { useParams } from 'react-router-dom';
import EntryPoints from '../components/EntryPoints';

const EntryPointsRoute = () => {
  const { id } = useParams();

  return <EntryPoints id={id} />;
};

export default EntryPointsRoute;
