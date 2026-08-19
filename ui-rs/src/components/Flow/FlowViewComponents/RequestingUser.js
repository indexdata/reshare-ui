import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { Accordion, Col, KeyValue, Row } from '@folio/stripes/components';
import { useStripes } from '@folio/stripes/core';
import { upNLevels } from '@projectreshare/stripes-reshare';

import patronEmail from '../../../util/patronEmail';

const RequestingUser = ({ request }) => {
  const stripes = useStripes();
  const location = useLocation();
  const patronInfo = request?.illRequest?.patronInfo ?? {};
  const { patronId, surname, givenName } = patronInfo;
  const email = patronEmail(patronInfo);

  if (request?.side !== 'borrowing') return null;
  if (!patronId && !surname && !givenName) return null;

  // Without a configured patron URL there is no local ILS to cross-reference, and
  // this section is deliberately absent rather than showing patron detail alone.
  const patronURLTemplate = stripes?.config?.reshare?.patronURL;
  if (!patronURLTemplate) return null;

  const patronURL = patronId ? patronURLTemplate.replace('{patronid}', patronId) : null;
  const listPath = upNLevels(location, 2).split('?')[0];

  return (
    <Accordion
      id="requestingUser"
      label={<FormattedMessage id="ui-rs.flow.sections.requestingUser" />}
    >
      <Row>
        <Col xs={3}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.information.lastName" />}
            value={surname}
          />
        </Col>
        <Col xs={3}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.information.firstName" />}
            value={givenName}
          />
        </Col>
        <Col xs={3}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.information.userId" />}
            value={patronId}
          />
        </Col>
        <Col xs={3}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.information.emailAddress" />}
            value={email}
          />
        </Col>
      </Row>
      <Row>
        {patronURL &&
          <Col xs={4}>
            <Link to={patronURL}><FormattedMessage id="ui-rs.flow.info.patronLink" /></Link>
          </Col>
        }
        {patronId &&
          <Col xs={4}>
            <Link to={`${listPath}?filters=terminal.false&qindex=patron&query=${encodeURIComponent(patronId)}&sort=-dateCreated`}>
              <FormattedMessage id="ui-rs.flow.info.patronQuery" />
            </Link>
          </Col>
        }
      </Row>
    </Accordion>
  );
};

export default RequestingUser;
