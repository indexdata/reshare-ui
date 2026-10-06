import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { IfPermission } from '@folio/stripes/core';
import { Card, Col, KeyValue, Row } from '@folio/stripes/components';

const PeerCard = ({ id, label, name, symbol }) => (
  <Card
    id={id}
    headerStart={<strong><FormattedMessage id={label} /></strong>}
    headerEnd={symbol && (
      <IfPermission perm="module.rsdir.enabled">
        <Link to={`/directory/entries/by-symbol/${symbol}`}>
          <FormattedMessage id="ui-update.viewInDirectory" />
        </Link>
      </IfPermission>
    )}
    roundedBorder
  >
    <KeyValue label={<FormattedMessage id="ui-update.peer.name" />} value={name} />
    <KeyValue label={<FormattedMessage id="ui-update.peer.symbol" />} value={symbol} />
  </Card>
);

const RequesterSupplier = ({ request }) => (
  <Row>
    <Col xs={6}>
      <PeerCard
        id="requester-card"
        label="ui-update.column.requester"
        name={request.requesterName}
        symbol={request.requesterSymbol}
      />
    </Col>
    <Col xs={6}>
      <PeerCard
        id="supplier-card"
        label="ui-update.column.supplier"
        name={request.supplierName}
        symbol={request.supplierSymbol}
      />
    </Col>
  </Row>
);

export default RequesterSupplier;
