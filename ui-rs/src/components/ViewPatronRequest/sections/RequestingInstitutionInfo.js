import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import {
  Accordion,
  Card,
  Col,
  KeyValue,
  Row,
} from '@folio/stripes/components';

import formatAddress from '#/util/formatAddress';
import { firstEmail } from '#/util/patronEmail';
import css from './RequestingInstitutionInfo.css';

// The requester as the lender sees it. requesterName is the broker's directory
// name for the symbol; requestingAgencyInfo is what the requester sent, present
// only when its directory entry opts in to including it.
const RequestingInstitutionInfo = ({ record }) => {
  if (record?.side !== 'lending') return null;

  const agencyInfo = record.illRequest?.requestingAgencyInfo ?? {};
  const physicalAddress = agencyInfo.address?.find(a => a?.physicalAddress)?.physicalAddress;
  const symbol = record.requesterSymbol;

  return (
    <Accordion
      id="requestingInstitutionInfo"
      label={<FormattedMessage id="ui-rs.information.heading.requestinginstitution" />}
    >
      <Card
        id="requestingInstitutionInfo-card"
        headerStart={<FormattedMessage id="ui-rs.institution" />}
        headerEnd={symbol && (
          <Link to={`/directory/entries/by-symbol/${symbol}`}>
            <FormattedMessage id="ui-rs.viewInDirectory" />
          </Link>
        )}
        roundedBorder
        cardClass={css.institutionCard}
        headerClass={css.institutionCardHeader}
      >
        <Row>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.institutionName" />}
              value={record.requesterName ?? agencyInfo.name}
            />
          </Col>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.symbol" />}
              value={symbol}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.contactName" />}
              value={agencyInfo.contactName}
            />
          </Col>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.emailAddress" />}
              value={firstEmail(agencyInfo.address)}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.address" />}
              value={formatAddress(physicalAddress)}
            />
          </Col>
        </Row>
      </Card>
    </Accordion>
  );
};

export default RequestingInstitutionInfo;
