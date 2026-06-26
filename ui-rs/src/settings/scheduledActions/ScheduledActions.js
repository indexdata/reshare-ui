import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button, MultiColumnList, Pane, PaneMenu } from '@folio/stripes/components';
import { DirectLink, useOkapiQuery } from '@projectreshare/stripes-reshare';

import { describeSchedule } from './schedule/scheduleExpression';
import CreateScheduledAction from './CreateScheduledAction';
import ViewScheduledAction from './ViewScheduledAction';
import EditScheduledAction from './EditScheduledAction';

const ScheduledActionsList = ({ match, history }) => {
  const intl = useIntl();
  const { data, isSuccess } = useOkapiQuery('broker/batch_actions');
  const items = data?.items ?? [];

  const formatter = {
    actionName: r => intl.formatMessage({
      id: `ui-rs.settings.scheduledActions.action.${r.actionName}`,
      defaultMessage: r.actionName,
    }),
    schedule: r => describeSchedule(r.schedule, intl),
    active: r => intl.formatMessage({
      id: `ui-rs.settings.scheduledActions.status.${r.active ? 'active' : 'inactive'}`,
    }),
    createdAt: r => (r.createdAt ? intl.formatDate(r.createdAt) : ''),
  };

  return (
    <Pane
      defaultWidth="fill"
      paneTitle={<FormattedMessage id="ui-rs.settings.scheduledActions.heading" />}
      lastMenu={
        <PaneMenu>
          <DirectLink
            component={Button}
            id="clickable-new-scheduled-action"
            to={`${match.url}/new`}
            buttonStyle="primary paneHeaderNewButton"
            marginBottom0
          >
            <FormattedMessage id="ui-rs.settings.scheduledActions.new" />
          </DirectLink>
        </PaneMenu>
      }
    >
      <MultiColumnList
        contentData={items}
        visibleColumns={['actionName', 'schedule', 'active', 'createdAt']}
        columnMapping={{
          actionName: <FormattedMessage id="ui-rs.settings.scheduledActions.field.actionName" />,
          schedule: <FormattedMessage id="ui-rs.settings.scheduledActions.field.schedule" />,
          active: <FormattedMessage id="ui-rs.settings.scheduledActions.field.active" />,
          createdAt: <FormattedMessage id="ui-rs.settings.scheduledActions.field.createdAt" />,
        }}
        formatter={formatter}
        onRowClick={(_e, row) => history.push({ pathname: `${match.url}/${row.id}`, state: { direct: true } })}
        isEmptyMessage={
          isSuccess
            ? <FormattedMessage id="ui-rs.settings.scheduledActions.empty" />
            : ''
        }
      />
    </Pane>
  );
};

// Settings renders this page at a non-exact route, so it also receives the
// /new, /:id and /:id/edit sub-paths; we discriminate with a nested Switch. The
// sub-routes close via useCloseDirect, which returns to the natural previous
// location when navigated to in-app and degrades to upNLevels otherwise.
const ScheduledActions = ({ match }) => (
  <Switch>
    <Route
      path={`${match.path}/new`}
      component={CreateScheduledAction}
    />
    <Route
      path={`${match.path}/:id/edit`}
      component={EditScheduledAction}
    />
    <Route
      path={`${match.path}/:id`}
      component={ViewScheduledAction}
    />
    <Route render={props => <ScheduledActionsList {...props} match={match} />} />
  </Switch>
);

export default ScheduledActions;
