import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import Settings from './settings';
import AppNameContext from './AppNameContext';

import CreateEditRoute from './routes/CreateEditRoute';
import PatronRequestsRoute from './routes/PatronRequestsRoute';
import PullSlipRoute from './routes/PullSlipRoute';
import PullSlipsRoute from './routes/PullSlipsRoute';
import ViewRoute from './routes/ViewRoute';

const ResourceSharing = (props) => {
  const {
    actAs,
    match: { path },
    location: { search }
  } = props;

  const appName = path.substring(1).replace(/\/.*/, '');
  props.stripes.logger.log('appName', `us-rs: path='${path}', appName='${appName}'`);

  if (actAs === 'settings') {
    return <Settings {...props} appName={appName} />;
  }

  return (
    <AppNameContext.Provider value={appName}>
      <Switch>
        <Redirect
          exact
          from={path}
          to={`${path}/requests`}
        />

        {/* Backwards compatibility for previous client-side URLs */}
        <Redirect
          exact
          from={`${path}/requests/view/:id`}
          to={`${path}/requests/:id${search}`}
        />
        <Redirect
          exact
          from={`${path}/requests/view/:id/flow`}
          to={`${path}/requests/:id/flow${search}`}
        />
        <Redirect
          exact
          from={`${path}/requests/view/:id/details`}
          to={`${path}/requests/:id/details${search}`}
        />

        {appName === 'request' &&
          <Route path={`${path}/requests/create`} component={CreateEditRoute} />
        }
        {appName === 'request' &&
          <Route path={`${path}/requests/:id/edit`} component={CreateEditRoute} />
        }
        <Route path={`${path}/requests/pullslips`} component={PullSlipsRoute} />
        <Route path={`${path}/requests/:id/pullslip`} component={PullSlipRoute} />
        {appName === 'request' &&
          <Route path={`${path}/requests/:id/rerequest`} component={CreateEditRoute} />
        }
        {appName === 'request' &&
          <Route path={`${path}/requests/:id/revalidate`} component={CreateEditRoute} />
        }
        <Redirect
          exact
          from={`${path}/requests/:id`}
          to={`${path}/requests/:id/flow${search}`}
        />

        {/* Contains nested routes: ./details and ./flow */}
        <Route path={`${path}/requests/:id`} component={ViewRoute} />

        <Route
          path={`${path}/requests/:action?`}
          render={(p) => <PatronRequestsRoute {...p} appName={appName} />}
        />
      </Switch>
    </AppNameContext.Provider>
  );
};

export default ResourceSharing;
