import React from 'react';
import { coreEvents } from '@folio/stripes/core';
import ScanRoute from './routes/ScanRoute';
import { reset } from './scanStore';

const ScanRoot = () => <ScanRoute />;

// Clear scans on login so the next user cannot inherit them.
ScanRoot.eventHandler = (event) => {
  if (event === coreEvents.LOGIN) reset();
  return null;
};

export default ScanRoot;
