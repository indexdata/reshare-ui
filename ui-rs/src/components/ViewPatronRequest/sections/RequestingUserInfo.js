import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { useStripes } from '@folio/stripes/core';
import {
  Accordion,
  Card,
  Col,
  KeyValue,
  Row,
} from '@folio/stripes/components';

import patronEmail from '../../../util/patronEmail';
import css from './RequestingUserInfo.css';

const RequestingUserInfo = ({ record }) => {
  const stripes = useStripes();
  const patronInfo = record?.illRequest?.patronInfo ?? {};
  const { patronId, surname, givenName } = patronInfo;
  const email = patronEmail(patronInfo);

  // The broker forwards patronInfo to the supplier, but the patron is the
  // borrowing library's to know.
  if (record?.side !== 'borrowing') return null;
  // patronInfo is optional in ISO 18626, so a request may genuinely have none.
  if (!patronId && !surname && !givenName) return null;

  const patronURLTemplate = stripes?.config?.reshare?.patronURL;
  const patronLink = patronId && patronURLTemplate
    ? <Link to={patronURLTemplate.replace('{patronid}', patronId)}>{patronId}</Link>
    : patronId;

  return (
    <Accordion
      id="requestingUserInfo"
      label={<FormattedMessage id="ui-rs.information.heading.requester" />}
    >
      <Card
        id="requestingUserInfo-card"
        headerStart={<FormattedMessage id="ui-rs.user" />}
        roundedBorder
        cardClass={css.userCard}
        headerClass={css.userCardHeader}
      >
        <Row>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.userId" />}
              value={patronLink}
            />
          </Col>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.emailAddress" />}
              value={email}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.lastName" />}
              value={surname}
            />
          </Col>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.firstName" />}
              value={givenName}
            />
          </Col>
        </Row>
      </Card>
    </Accordion>
  );
};

export default RequestingUserInfo;
