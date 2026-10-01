import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { BrokerEventsProvider, RequestCacheSync } from '@projectreshare/stripes-reshare';
import Settings from './settings';
import AppNameContext from './AppNameContext';

import CreateRoute from './routes/CreateRoute';
import EditRoute from './routes/EditRoute';
import PatronRequestsRoute from './routes/PatronRequestsRoute';
import PullSlipRoute from './routes/PullSlipRoute';
import PullSlipsRoute from './routes/PullSlipsRoute';
import RerequestRoute from './routes/RerequestRoute';
import ViewRoute from './routes/ViewRoute';

const ResourceSharing = (props) => {
  const {
    actAs,
    match: { path },
    location: { search }
  } = props;

  const appName = path.substring(1).replace(/\/.*/, '');
  props.stripes.logger.log('appName', `ui-rs: path='${path}', appName='${appName}'`);

  if (actAs === 'settings') {
    return <Settings {...props} appName={appName} />;
  }

  // The broker's event stream is per side, and an app instance is one side for
  // its whole life, so the connection belongs above the routes rather than in
  // any of them: it opens once and survives navigation between list and detail.
  const side = appName === 'supply' ? 'lending' : 'borrowing';

  return (
    <AppNameContext.Provider value={appName}>
      <BrokerEventsProvider side={side}>
        <RequestCacheSync />
        <Switch>
          <Redirect
            exact
            from={path}
            to={`${path}/requests`}
          />

          {appName === 'request' &&
            <Route path={`${path}/requests/create`} component={CreateRoute} />
          }
          {appName === 'request' &&
            <Route path={`${path}/requests/:id/edit`} component={EditRoute} />
          }
          {appName === 'request' &&
            <Route path={`${path}/requests/:id/rerequest`} component={RerequestRoute} />
          }
          <Route path={`${path}/requests/pullslips`} component={PullSlipsRoute} />
          <Route path={`${path}/requests/:id/pullslip`} component={PullSlipRoute} />
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
      </BrokerEventsProvider>
    </AppNameContext.Provider>
  );
};

export default ResourceSharing;
