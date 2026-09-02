import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useHistory, useLocation } from 'react-router-dom';
import {
  Button,
  NavList,
  NavListItem,
  NavListSection,
  Pane,
  PaneMenu,
} from '@folio/stripes/components';
import { useCloseDirect, useOkapiQuery } from '@projectreshare/stripes-reshare';
import ViewEntry from './ViewEntry';

const entryPath = id => `directory/entries/by-id/${id}`;

const EntryPoints = ({ id }) => {
  const history = useHistory();
  const intl = useIntl();
  const location = useLocation();
  const close = useCloseDirect(`/directory/entries${location.search}`);
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
  const basePath = `/directory/entries/entry-points/${id}`;
  const editBasePath = `${basePath}/edit`;
  const isEditTab = location.pathname.startsWith(editBasePath);
  const tiersPath = `${editBasePath}/tiers`;
  const networksPath = `${editBasePath}/networks`;
  const activeLink = `${location.pathname}${location.search}`;

  const showEditOptions = () => {
    history.push(`${editBasePath}${location.search}`);
  };

  const editMenu = !isEditTab && (
    <PaneMenu>
      <Button
        buttonStyle="primary paneHeaderNewButton"
        id="clickable-entry-points-edit"
        marginBottom0
        onClick={showEditOptions}
      >
        <FormattedMessage id="ui-rsdir.edit" />
      </Button>
    </PaneMenu>
  );

  return (
    <Pane
      defaultWidth="fill"
      dismissible
      lastMenu={editMenu}
      onClose={close}
      paneTitle={title}
    >
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
              id="clickable-entry-point-catalog-config"
              to={`${editBasePath}/catalogconfig${location.search}`}
            >
              <FormattedMessage id="ui-rsdir.entryPoints.section.catalogConfig" />
            </NavListItem>
            <NavListItem
              id="clickable-entry-point-holdings-policy"
              to={`${editBasePath}/holdingspolicy${location.search}`}
            >
              <FormattedMessage id="ui-rsdir.entryPoints.section.holdingsPolicy" />
            </NavListItem>
            <NavListItem
              id="clickable-entry-point-ill-config"
              to={`${editBasePath}/illconfig${location.search}`}
            >
              <FormattedMessage id="ui-rsdir.entryPoints.section.illConfig" />
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
      <ViewEntry entry={entry} isEmbedded showActions={false} />
    </Pane>
  );
};

export default EntryPoints;
