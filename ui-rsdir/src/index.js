import React from 'react';
import { Redirect, Route, Switch } from '@folio/stripes/core';

import EntriesRoute from './routes/EntriesRoute';
import ViewEntryRoute from './routes/ViewEntryRoute';
import EditEntryRoute from './routes/EditEntryRoute';
import EditCatalogConfigRoute from './routes/EditCatalogConfigRoute';
import EditHoldingsPolicyRoute from './routes/EditHoldingsPolicyRoute';
import EditIllConfigRoute from './routes/EditIllConfigRoute';
import EditLMSConfigRoute from './routes/EditLMSConfigRoute';
import EntryNetworksRoute from './routes/EntryNetworksRoute';
import EntryTiersRoute from './routes/EntryTiersRoute';

const RSDir = (props) => {
  const {
    actAs,
    match: { path },
  } = props;

  if (actAs === 'settings') {
    // TODO settings?
  }

  // EntriesRoute supplies the paneset; everything under an entry renders its
  // own EntryPane beside the list of sections, so the sections are flat leaves.
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
          <Route path={`${path}/entries/:id/lmsconfig`} component={EditLMSConfigRoute} />
          <Route path={`${path}/entries/:id/catalogconfig`} component={EditCatalogConfigRoute} />
          <Route path={`${path}/entries/:id/holdingspolicy`} component={EditHoldingsPolicyRoute} />
          <Route path={`${path}/entries/:id/illconfig`} component={EditIllConfigRoute} />
          <Route path={`${path}/entries/:id/tiers`} component={EntryTiersRoute} />
          <Route path={`${path}/entries/:id/networks`} component={EntryNetworksRoute} />
          <Route path={`${path}/entries/:id`} component={ViewEntryRoute} />
        </Switch>
      </Route>
    </Switch>
  );
};

export default RSDir;
