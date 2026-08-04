import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button, MultiColumnList, Pane, PaneMenu } from '@folio/stripes/components';
import { DirectLink, useOkapiQuery } from '@projectreshare/stripes-reshare';

import CreateTemplate from './CreateTemplate';
import ViewTemplate from './ViewTemplate';
import EditTemplate from './EditTemplate';

const TemplatesList = ({ match, history }) => {
  const intl = useIntl();
  const { data, isSuccess } = useOkapiQuery('broker/templates', {
    searchParams: { limit: 100 },
  });
  const items = data?.items ?? [];

  const formatter = {
    purpose: r => intl.formatMessage({ id: `ui-rs.settings.templates.purpose.${r.purpose}`, defaultMessage: r.purpose }),
    contentType: r => intl.formatMessage({ id: `ui-rs.settings.templates.contentType.${r.contentType}`, defaultMessage: r.contentType }),
    labels: r => (r.labels ?? []).join(', '),
    // An absent audience means the template serves both.
    audience: r => intl.formatMessage({ id: `ui-rs.settings.templates.audience.${r.audience || 'both'}` }),
    updatedAt: r => {
      const stamp = r.updatedAt ?? r.createdAt;
      return stamp ? intl.formatDate(stamp) : '';
    },
  };

  return (
    <Pane
      defaultWidth="fill"
      paneTitle={<FormattedMessage id="ui-rs.settings.templates.heading" />}
      lastMenu={
        <PaneMenu>
          <DirectLink
            component={Button}
            id="clickable-new-template"
            to={`${match.url}/new`}
            buttonStyle="primary paneHeaderNewButton"
            marginBottom0
          >
            <FormattedMessage id="ui-rs.settings.templates.new" />
          </DirectLink>
        </PaneMenu>
      }
    >
      <MultiColumnList
        contentData={items}
        visibleColumns={['title', 'purpose', 'labels', 'audience', 'contentType', 'updatedAt']}
        columnMapping={{
          title: <FormattedMessage id="ui-rs.settings.templates.field.title" />,
          purpose: <FormattedMessage id="ui-rs.settings.templates.field.purpose" />,
          labels: <FormattedMessage id="ui-rs.settings.templates.field.labels" />,
          audience: <FormattedMessage id="ui-rs.settings.templates.field.audience" />,
          contentType: <FormattedMessage id="ui-rs.settings.templates.field.contentType" />,
          updatedAt: <FormattedMessage id="ui-rs.settings.templates.field.updatedAt" />,
        }}
        formatter={formatter}
        onRowClick={(_e, row) => history.push({ pathname: `${match.url}/${row.id}`, state: { direct: true } })}
        isEmptyMessage={
          isSuccess
            ? <FormattedMessage id="ui-rs.settings.templates.empty" />
            : ''
        }
      />
    </Pane>
  );
};

const Templates = ({ match }) => (
  <Switch>
    <Route
      exact
      path={`${match.path}/new`}
      component={CreateTemplate}
    />
    <Route
      exact
      path={`${match.path}/:id/edit`}
      component={EditTemplate}
    />
    <Route
      exact
      path={`${match.path}/:id`}
      component={ViewTemplate}
    />
    <Route
      exact
      path={match.path}
      component={TemplatesList}
    />
  </Switch>
);

export default Templates;
