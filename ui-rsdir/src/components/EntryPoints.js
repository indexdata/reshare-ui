import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useHistory, useLocation } from 'react-router-dom';
import {
  Button,
  NavList,
  NavListItem,
  NavListSection,
  Pane,
} from '@folio/stripes/components';
import { useCloseDirect, useOkapiQuery } from '@projectreshare/stripes-reshare';
import ViewEntry from './ViewEntry';

const entryPath = id => `rsdir/entries/by-id/${id}`;

const EntryPoints = ({ id }) => {
  const history = useHistory();
  const intl = useIntl();
  const location = useLocation();
  const close = useCloseDirect(`/rsdir/entries${location.search}`);
  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: 2 * 60 * 1000,
    cacheTime: 8 * 60 * 60 * 1000,
    keepPreviousData: true,
    enabled: !!id,
  });

  if (!entryQuery.isSuccess) {
    return null;
  }

  const entry = entryQuery.data;
  const title = intl.formatMessage({ id: 'ui-rsdir.entryPoints.title' }, { name: entry.name });
  const basePath = `/rsdir/entries/entry-points/${id}`;
  const editBasePath = `${basePath}/edit`;
  const isEditTab = location.pathname.startsWith(editBasePath);
  const tiersPath = `${editBasePath}/tiers`;
  const networksPath = `${editBasePath}/networks`;
  const activeLink = `${location.pathname}${location.search}`;

  const setViewTab = () => {
    history.push(`${basePath}${location.search}`);
  };

  const setEditTab = () => {
    history.push(`${editBasePath}/entry${location.search}`);
  };

  const tabs = (
    <div
      aria-label={intl.formatMessage({ id: 'ui-rsdir.entryPoints.tabs' })}
      role="tablist"
    >
      <Button
        aria-selected={!isEditTab}
        buttonStyle={!isEditTab ? 'primary' : 'default'}
        id="clickable-entry-points-view-tab"
        marginBottom0
        onClick={setViewTab}
        role="tab"
      >
        <FormattedMessage id="ui-rsdir.entryPoints.viewTab" />
      </Button>
      <Button
        aria-selected={isEditTab}
        buttonStyle={isEditTab ? 'primary' : 'default'}
        id="clickable-entry-points-edit-tab"
        marginBottom0
        onClick={setEditTab}
        role="tab"
      >
        <FormattedMessage id="ui-rsdir.entryPoints.editTab" />
      </Button>
    </div>
  );

  return (
    <Pane
      defaultWidth="fill"
      dismissible
      onClose={close}
      paneTitle={title}
    >
      {tabs}
      {!isEditTab &&
        <ViewEntry entry={entry} isEmbedded showActions={false} />
      }
      {isEditTab &&
        <NavList aria-label={title}>
          <NavListSection activeLink={activeLink} striped>
            <NavListItem
              id="clickable-entry-point-edit"
              to={`${editBasePath}/entry${location.search}`}
            >
              <FormattedMessage id="ui-rsdir.entryPoints.section.entry" />
            </NavListItem>
            <NavListItem
              id="clickable-entry-point-lms-config"
              to={`${editBasePath}/lmsconfig${location.search}`}
            >
              <FormattedMessage id="ui-rsdir.entryPoints.section.lmsConfig" />
            </NavListItem>
            <NavListItem
              id="clickable-entry-point-tiers"
              to={`${tiersPath}${location.search}`}
            >
              <FormattedMessage id="ui-rsdir.entryPoints.section.tiers" />
            </NavListItem>
            <NavListItem
              id="clickable-entry-point-networks"
              to={`${networksPath}${location.search}`}
            >
              <FormattedMessage id="ui-rsdir.entryPoints.section.networks" />
            </NavListItem>
          </NavListSection>
        </NavList>
      }
    </Pane>
  );
};

export default EntryPoints;
