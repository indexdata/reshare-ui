import React from 'react';
import { Redirect, Switch } from 'react-router-dom';
import { Route } from '@folio/stripes/core';
import EntriesRoute from './EntriesRoute';
import ViewEntryRoute from './ViewEntryRoute';
import EditEntryRoute from './EditEntryRoute';
import EditLMSConfigRoute from './EditLMSConfigRoute';
import EditEntryNetworksRoute from './EditEntryNetworksRoute';
import EditEntryTiersRoute from './EditEntryTiersRoute';
import EntryPointsRoute from './EntryPointsRoute';
import EntryPointNetworksRoute from './EntryPointNetworksRoute';
import EntryPointTiersRoute from './EntryPointTiersRoute';
import ManageEntryNetworksRoute from './ManageEntryNetworksRoute';
import ManageEntryTiersRoute from './ManageEntryTiersRoute';

const DirectoryRoute = ({ match: { path } }) => {
  return (
    <Switch>
      <Redirect
        exact
        from={path}
        to={`${path}/entries`}
      />
      <Route path={`${path}/entries`} component={EntriesRoute}>
        <Route path={`${path}/entries/create`} component={EditEntryRoute} />
        <Route path={`${path}/entries/entry-points/:id`} component={EntryPointsRoute} />
        <Route path={`${path}/entries/entry-points/:id/edit/entry`} component={EditEntryRoute} />
        <Route path={`${path}/entries/entry-points/:id/edit/lmsconfig`} component={EditLMSConfigRoute} />
        <Route path={`${path}/entries/entry-points/:id/edit/networks`} component={EntryPointNetworksRoute} />
        <Route path={`${path}/entries/entry-points/:id/edit/tiers`} component={EntryPointTiersRoute} />
        <Route path={`${path}/entries/view/:id`} component={ViewEntryRoute} />
        <Route path={`${path}/entries/edit/:id`} component={EditEntryRoute} />
        <Route path={`${path}/entries/lmsconfig/edit/:id`} component={EditLMSConfigRoute} />
        <Route path={`${path}/entries/networks/manage/:id`} component={ManageEntryNetworksRoute} />
        <Route path={`${path}/entries/networks/edit/:id`} component={EditEntryNetworksRoute} />
        <Route path={`${path}/entries/tiers/manage/:id`} component={ManageEntryTiersRoute} />
        <Route path={`${path}/entries/tiers/edit/:id`} component={EditEntryTiersRoute} />
      </Route>
    </Switch>
  );
};

export default DirectoryRoute;
