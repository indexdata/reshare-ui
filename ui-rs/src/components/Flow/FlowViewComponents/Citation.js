import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Accordion, Col, KeyValue, Row } from '@folio/stripes/components';

const Citation = ({ request }) => {
  const { bibliographicInfo = {}, publicationInfo = {}, serviceInfo = {} } = request?.illRequest ?? {};
  if (serviceInfo.serviceType !== 'Copy') return null;

  const { titleOfComponent, authorOfComponent, volume, issue, pagesRequested } = bibliographicInfo;
  // Compliance codes are open codes a partner may send in any casing; the keys
  // are lower case, and an unrecognised code shows as itself.
  const copyright = serviceInfo.copyrightCompliance?.['#text'];

  return (
    <Accordion
      id="citation"
      label={<FormattedMessage id="ui-rs.flow.sections.citation" />}
    >
      <Row>
        <Col xs={6}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.information.titleOfComponent" />}
            value={titleOfComponent}
          />
        </Col>
        <Col xs={3}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.information.volume" />}
            value={volume}
          />
        </Col>
        <Col xs={3}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.information.date" />}
            value={publicationInfo.publicationDate}
          />
        </Col>
      </Row>
      <Row>
        <Col xs={6}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.information.authorOfComponent" />}
            value={authorOfComponent}
          />
        </Col>
        <Col xs={3}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.information.issue" />}
            value={issue}
          />
        </Col>
        <Col xs={3}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.information.pages" />}
            value={pagesRequested}
          />
        </Col>
      </Row>
      {copyright &&
        <Row>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.copyrightType" />}
              value={<FormattedMessage id={`stripes-reshare.iso18626.CopyrightCompliance.${copyright}`} defaultMessage={copyright} />}
            />
          </Col>
        </Row>
      }
    </Accordion>
  );
};

export default Citation;
