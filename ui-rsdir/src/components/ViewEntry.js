import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation, useHistory } from 'react-router-dom';
import {
  Accordion,
  AccordionSet,
  Button,
  Card,
  Col,
  Headline,
  KeyValue,
  Pane,
  PaneMenu,
  Row,
} from '@folio/stripes/components';
import { useCloseDirect, upNLevels } from '@projectreshare/stripes-reshare';

const ViewEntry = ({ entry }) => {
  const location = useLocation();
  const history = useHistory();
  const intl = useIntl();
  const close = useCloseDirect(upNLevels(location, 2));

  const handleEdit = () => {
    history.push(`/rsdir/entries/edit/${entry.id}`);
  };

  const handleLMSEdit = () => {
    history.push(`/rsdir/entries/lmsconfig/edit/${entry.id}`);
  };

  const formatSymbols = (symbols) => {
    if (!symbols || symbols.length === 0) return '';
    return symbols
      .map(s => `${s.authority}:${s.symbol}`)
      .join(', ');
  };

  const formatTiers = (tiers) => {
    if (!tiers || tiers.length === 0) return '';
    return tiers
      .map(t => t.name)
      .join(', ');
  };

  const formatNetworks = (networks) => {
    if (!networks || networks.length === 0) return '';
    return networks
      .map(n => n.name)
      .join(', ');
  };

  const displayTF = (val) => {
    if (val === true || val === false) {
      return val.toString();
    }
    return '-';
  };

  const formatLMSConfig = (lmsConfig) => {
    return (
      <Card
        headerStart={
          <Headline margin="none">
            <FormattedMessage id="ui-rsdir.lmsConfig.header" />
          </Headline>
        }
        headerEnd={
          <Button
            id="clickable-edit-entry-lmsconfig"
            onClick={handleLMSEdit}
            buttonStyle="primary paneHeaderNewButton"
            marginBottom0
          >
            <FormattedMessage id="ui-rsdir.edit" />
          </Button>
        }
        cardStyle="positive"
        roundedBorder
        marginBottom0
      >
        <Row>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.address" />}
              value={lmsConfig.address}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.fromAgency" />}
              value={lmsConfig.fromAgency}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.toAgency" />}
              value={lmsConfig.toAgency}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.fromAgencyAuthentication" />}
              value={lmsConfig.fromAgencyAuthentication}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.itemLocation" />}
              value={lmsConfig.itemLocation}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.requestItemBibIdCode" />}
              value={lmsConfig.requestItemBibIdCode}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.acceptItemEnabled" />}
              value={displayTF(lmsConfig.acceptItemEnabled)}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.checkInItemEnabled" />}
              value={displayTF(lmsConfig.checkInItemEnabled)}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.checkOutItemEnabled" />}
              value={displayTF(lmsConfig.checkOutItemEnabled)}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.lookupUserEnabled" />}
              value={displayTF(lmsConfig.lookupUserEnabled)}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.requestItemPickupLocationEnabled" />}
              value={displayTF(lmsConfig.requestItemPickupLocationEnabled)}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.requesterPickupLocation" />}
              value={lmsConfig.requesterPickupLocation}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.supplierPickupLocation" />}
              value={lmsConfig.supplierPickupLocation}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.requestItemRequestScopeType" />}
              value={lmsConfig.requestItemRequestScopeType}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.requesterPatronPattern" />}
              value={lmsConfig.requesterPatronPattern}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.lmsConfig.requestItemRequestType" />}
              value={lmsConfig.requestItemRequestType}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  const formatClosure = (closure) => {
    if (!closure) {
      return null;
    }
    return (
      <Card
        headerStart={
          <Headline margin="none">
            <FormattedMessage
              id="ui-rsdir.closure.header"
              values={{ reason: closure.reason }}
            />
          </Headline>
        }
        cardStyle="positive"
        roundedBorder
        marginBottom0
      >
        <Row>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.closure.startDate" />}
              value={closure.startDate}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.closure.endDate" />}
              value={closure.endDate}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  const formatAddress = (address) => {
    return (
      <Card
        headerStart={(
          <Headline margin="none">
            <FormattedMessage
              id="ui-rsdir.address.header"
              defaultMessage="{type} address"
              values={{ type: address.type }}
            />
          </Headline>
         )}
        cardStyle="positive"
        roundedBorder
        marginBottom0
      >
        { address.addressComponents && address.addressComponents.map(component => {
          return (
            <Row key={`${address.id}-${component.seq}`}>
              <Col xs={3}>
                <KeyValue
                  label={<FormattedMessage id="ui-rsdir.address.sequence" />}
                  value={component.seq}
                />
              </Col>
              <Col xs={3}>
                <KeyValue
                  label={<FormattedMessage id="ui-rsdir.address.type" />}
                  value={component.type}
                />
              </Col>
              <Col xs={3}>
                <KeyValue
                  label={<FormattedMessage id="ui-rsdir.address.value" />}
                  value={component.value}
                />
              </Col>
            </Row>
          );
        })}
      </Card>
    );
  };

  return (
    <Pane
      defaultWidth="fill"
      paneTitle={entry.name || intl.formatMessage({ id: 'ui-rsdir.entries.info' })}
      onClose={close}
      dismissible
      lastMenu={
        <PaneMenu>
          <Button
            id="clickable-edit-entry"
            onClick={handleEdit}
            buttonStyle="primary paneHeaderNewButton"
            marginBottom0
          >
            <FormattedMessage id="ui-rsdir.edit" />
          </Button>
        </PaneMenu>
      }
    >
      <AccordionSet>
        <Accordion
          id="directory-entry-info"
          label={<FormattedMessage id="ui-rsdir.entries.info" />}
        >
          <Row>
            <Col xs={4}>
              <KeyValue
                label={<FormattedMessage id="ui-rsdir.entry.name" />}
                value={entry.name}
              />
            </Col>
            <Col xs={4}>
              <KeyValue
                label={<FormattedMessage id="ui-rsdir.entry.type" />}
                value={entry.type}
              />
            </Col>
          </Row>
          <Row>
            <Col xs={12}>
              <KeyValue
                label={<FormattedMessage id="ui-rsdir.entry.description" />}
                value={entry.description}
              />
            </Col>
          </Row>
          <Row>
            <Col xs={3}>
              <KeyValue
                label={<FormattedMessage id="ui-rsdir.entry.organizationId" />}
                value={entry.organizationId}
              />
            </Col>
            <Col xs={3}>
              <KeyValue
                label={<FormattedMessage id="ui-rsdir.entry.contactName" />}
                value={entry.contactName}
              />
            </Col>
            <Col xs={3}>
              <KeyValue
                label={<FormattedMessage id="ui-rsdir.entry.email" />}
                value={entry.email}
              />
            </Col>
            <Col xs={3}>
              <KeyValue
                label={<FormattedMessage id="ui-rsdir.entry.phoneNumber" />}
                value={entry.phoneNumber}
              />
            </Col>
          </Row>
          <Row>
            <Col xs={4}>
              <KeyValue
                label={<FormattedMessage id="ui-rsdir.entry.symbols" />}
                value={formatSymbols(entry.symbols)}
              />
            </Col>
            <Col xs={4}>
              <KeyValue
                label={<FormattedMessage id="ui-rsdir.entry.networks" />}
                value={formatNetworks(entry.networks)}
              />
            </Col>
            <Col xs={4}>
              <KeyValue
                label={<FormattedMessage id="ui-rsdir.entry.tiers" />}
                value={formatTiers(entry.tiers)}
              />
            </Col>
          </Row>
          { entry.addresses &&
            <Row>
              { entry.addresses.map((address) => {
                return (<React.Fragment key={address.id}>{formatAddress(address)}</React.Fragment>);
              })}
            </Row>
          }
          { entry.closures &&
            <Row>
              { entry.closures.map((it) => { return (<React.Fragment key={it.id}>{formatClosure(it)}</React.Fragment>); }) }
            </Row>
          }
          { entry.lmsConfig &&
            <Accordion
              id="directory-entry-lms-config"
              closedByDefault
              label={<FormattedMessage id="ui-rsdir.viewentry.lmsConfig" />}
            >
              <Row>
                { formatLMSConfig(entry.lmsConfig) }
              </Row>
            </Accordion>
          }
        </Accordion>
      </AccordionSet>
    </Pane>
  );
};

export default ViewEntry;
