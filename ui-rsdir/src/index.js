import React from 'react';
import { Redirect, Route, Switch } from '@folio/stripes/core';

import EntriesRoute from './routes/EntriesRoute';
import ViewEntryRoute from './routes/ViewEntryRoute';
import EditEntryRoute from './routes/EditEntryRoute';
import CatalogConfigRoute from './routes/CatalogConfigRoute';
import HoldingsPolicyRoute from './routes/HoldingsPolicyRoute';
import ILLConfigRoute from './routes/ILLConfigRoute';
import LMSConfigRoute from './routes/LMSConfigRoute';
import NetworksRoute from './routes/NetworksRoute';
import TiersRoute from './routes/TiersRoute';

const RSDir = (props) => {
  const {
    actAs,
    match: { path },
  } = props;

  if (actAs === 'settings') {
    // TODO settings?
  }

  // The entry view is last because its path is a prefix of the rest.
  return (
    <Switch>
      <Redirect
        exact
        from={path}
        to={`${path}/entries`}
      />
      <Route path={`${path}/entries`} component={EntriesRoute}>
        <Switch>
          <Route path={`${path}/entries/create`} component={EditEntryRoute} />
          <Route path={`${path}/entries/:id/edit`} component={EditEntryRoute} />
          <Route path={`${path}/entries/:id/lmsconfig`} component={LMSConfigRoute} />
          <Route path={`${path}/entries/:id/catalogconfig`} component={CatalogConfigRoute} />
          <Route path={`${path}/entries/:id/holdingspolicy`} component={HoldingsPolicyRoute} />
          <Route path={`${path}/entries/:id/illconfig`} component={ILLConfigRoute} />
          <Route path={`${path}/entries/:id/tiers`} component={TiersRoute} />
          <Route path={`${path}/entries/:id/networks`} component={NetworksRoute} />
          <Route path={`${path}/entries/:id`} component={ViewEntryRoute} />
        </Switch>
      </Route>
    </Switch>
  );
};

export default RSDir;
