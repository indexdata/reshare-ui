import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Route, Switch } from 'react-router-dom';
import { Button, ButtonGroup, Icon, Layout, Pane, PaneMenu, Paneset, Tooltip } from '@folio/stripes/components';
import { upNLevels, useCloseDirect, useOkapiQuery } from '@projectreshare/stripes-reshare';

import FlowRoute from './FlowRoute';
import ViewPatronRequest from '../components/ViewPatronRequest';
import css from './ViewRoute.css';

const subheading = (req, params) => {
  if (!req || params.id !== req.id) return undefined;
  const title = req?.illRequest?.bibliographicInfo?.title;
  if (!title) return undefined;
  const requester = req.requesterSymbol || '';
  if (!requester) return title;
  const supplier = req.supplierSymbol || '';
  return supplier ? `${title} · ${requester} → ${supplier}` : `${title} · ${requester}`;
};

const ViewRoute = ({ location, location: { pathname }, match }) => {
  const id = match.params?.id;
  const intl = useIntl();
  const close = useCloseDirect(upNLevels(location, 2));

  const { data: request, isSuccess: hasRequestLoaded } = useOkapiQuery(
    `broker/patron_requests/${id}`,
    { parseResponse: false, staleTime: 2 * 60 * 1000, notifyOnChangeProps: 'tracked' }
  );
  const { data: actions = [] } = useOkapiQuery(
    `broker/patron_requests/${id}/actions`,
    { parseResponse: false, staleTime: 2 * 60 * 1000 }
  );

  if (!hasRequestLoaded) return null;

  const paneId = request.requesterRequestId || request.id;
  const patronNote = request?.illRequest?.serviceInfo?.note;

  return (
    <Paneset>
      <Pane
        centerContent
        paneTitle={intl.formatMessage({ id: 'ui-rs.view.title' }, { id: paneId })}
        paneSub={subheading(request, match.params)}
        padContent={false}
        onClose={close}
        dismissible
        lastMenu={(
          <PaneMenu>
            {patronNote &&
              <Tooltip
                id="rs-patron-note-tooltip"
                text={<FormattedMessage id="stripes-reshare.hasPatronNote" />}
              >
                {({ ref, ariaIds }) => (
                  <Icon
                    icon="profile"
                    aria-labelledby={ariaIds.text}
                    ref={ref}
                  />
                )}
              </Tooltip>
            }
          </PaneMenu>
        )}
        defaultWidth="fill"
        subheader={(
          <Layout
            className={`${css.tabContainer} flex centerContent flex-align-items-center full padding-start-gutter padding-end-gutter`}
          >
            <ButtonGroup>
              <Button
                marginBottom0
                to={`${match.url}/flow${location.search}`}
                buttonStyle={pathname.includes('/flow') ? 'primary' : 'default'}
                replace
              >
                <FormattedMessage id="ui-rs.flow.flow" />
              </Button>
              <Button
                marginBottom0
                to={`${match.url}/details${location.search}`}
                buttonStyle={pathname.includes('/details') ? 'primary' : 'default'}
                replace
              >
                <FormattedMessage id="ui-rs.flow.details" />
              </Button>
            </ButtonGroup>
          </Layout>
        )}
      >
        <Switch>
          <Route path={`${match.path}/details`} render={() => <ViewPatronRequest record={request} actions={actions} />} />
          <Route path={`${match.path}/flow`} render={() => <FlowRoute request={request} actions={actions} />} />
        </Switch>
      </Pane>
    </Paneset>
  );
};

export default ViewRoute;
