import { Redirect, Switch } from 'react-router-dom';
import { Route } from '@folio/stripes/core';
import EntriesRoute from './routes/EntriesRoute';
import ViewEntryRoute from './routes/ViewEntryRoute';
import EditEntryRoute from './routes/EditEntryRoute';
import EditLMSConfigRoute from './routes/EditLMSConfigRoute';

const RSDir = (props) => {
  const {
    actAs,
    match: { path },
  } = props;

  if (actAs === 'settings') {
    // TODO settings?
  }
  return (
    <Switch>
      <Redirect
        exact
        from={path}
        to={`${path}/entries`}
      />
      <Route path={`${path}/entries`} component={EntriesRoute}>
        <Route path={`${path}/entries/create`} component={EditEntryRoute} />
        <Route path={`${path}/entries/view/:id`} component={ViewEntryRoute} />
        <Route path={`${path}/entries/edit/:id`} component={EditEntryRoute} />
        <Route path={`${path}/entries/lmsconfig/edit/:id`} component={EditLMSConfigRoute} />
      </Route>
    </Switch>
  );
};

export default RSDir;
