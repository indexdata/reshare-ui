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
import { DirectLink, useOkapiQuery } from '@projectreshare/stripes-reshare';
import { apiAddressToDisplayComponents } from '../util/addressAdapter';
import { getAddressPlugin } from '../util/addressPlugin';

const normalizeList = data => (Array.isArray(data) ? data : data?.items || []);

const ViewEntry = ({ entry }) => {
  const stripes = useStripes();
  const addressPlugin = getAddressPlugin(stripes.config?.reshare?.addressPlugin);
  const parentQuery = useOkapiQuery(`directory/entries/by-id/${entry.parent}`, {
    staleTime: 2 * 60 * 1000,
    enabled: !!entry.parent,
  });
  const branchesQuery = useOkapiQuery('directory/entries', {
    enabled: entry.type === 'Institution' && !!entry.id,
    staleTime: 2 * 60 * 1000,
    searchParams: {
      cql: `type=Branch and parent=${entry.id}`,
      limit: '1000',
    },
  });
  const parentValue = parentQuery.data?.name || parentQuery.data?.id || entry.parent;
  const parentDisplay = ['Branch', 'Institution'].includes(entry.type)
    ? (
      <DirectLink
        to={`/directory/entries/${entry.parent}`}
        preserveSearch
      >
        {parentValue}
      </DirectLink>
    )
    : parentValue;
  const branches = normalizeList(branchesQuery.data)
    .filter(branch => branch.type === 'Branch' && branch.id);

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
              value={parentDisplay}
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
        <Col xs={4}>
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.entry.organizationId" />}
            value={entry.organizationId}
          />
        </Col>
        <Col xs={4}>
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.entry.tenant" />}
            value={entry.tenant}
          />
        </Col>
      </Row>
      <Row>
        <Col xs={4}>
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.entry.contactName" />}
            value={entry.contactName}
          />
        </Col>
        <Col xs={4}>
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.entry.email" />}
            value={entry.email}
          />
        </Col>
        <Col xs={4}>
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
      { branches.length > 0 &&
        <Row>
          <Col xs={12}>
            <KeyValue
              label={<FormattedMessage id="ui-rsdir.entry.branches" />}
              value={branches.map(branch => (
                <div key={branch.id}>
                  <DirectLink
                    to={`/directory/entries/${branch.id}`}
                    preserveSearch
                  >
                    {branch.name || branch.id}
                  </DirectLink>
                </div>
              ))}
            />
          </Col>
        </Row>
      }
      { entry.addresses &&
        <Row>
          { entry.addresses.map((address) => {
            return (<React.Fragment key={address.id}>{formatAddress(address)}</React.Fragment>);
          })}
        </Row>
      }
    </>
  );
};

export default ViewEntry;
