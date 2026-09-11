import React from 'react';
import { FormattedMessage } from 'react-intl';
import {
  Card,
  Col,
  Headline,
  KeyValue,
  Row,
} from '@folio/stripes/components';
import { useStripes } from '@folio/stripes/core';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import { apiAddressToDisplayComponents } from '../util/addressAdapter';
import { getAddressPlugin } from '../util/addressPlugin';

const ViewEntry = ({ entry }) => {
  const stripes = useStripes();
  const addressPlugin = getAddressPlugin(stripes.config?.reshare?.addressPlugin);
  const parentQuery = useOkapiQuery(`directory/entries/by-id/${entry.parent}`, {
    staleTime: 2 * 60 * 1000,
    enabled: !!entry.parent,
  });
  const parentValue = parentQuery.data?.name || parentQuery.data?.id || entry.parent;

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
    const addressComponents = apiAddressToDisplayComponents(
      address,
      addressPlugin.fieldOrder
    );

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
        <address style={{ fontStyle: 'normal' }}>
          {addressComponents.map((component, index) => (
            <div key={`${address.id}-${component.type}-${component.seq}-${index}`}>
              {component.value}
            </div>
          ))}
        </address>
      </Card>
    );
  };

  return (
    <>
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
        { entry.parent &&
          <Col xs={4}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.entry.parent" />}
              value={parentValue}
            />
          </Col>
        }
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
    </>
  );
};

export default ViewEntry;
