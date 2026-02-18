import React from 'react';
import { FormattedMessage } from 'react-intl';
import {
  Accordion,
  Card,
  Col,
  KeyValue,
  Row,
  FormattedUTCDate,
} from '@folio/stripes/components';
import formattedDateTime from '../../../util/formattedDateTime';

class RequestInfo extends React.Component {
  render() {
    const { record = {} } = this.props;
    const illRequest = record.illRequest || {};
    const deliveryInfo = illRequest.deliveryInfo || {};
    const serviceInfo = illRequest.serviceInfo || {};
    const pickupLocation = deliveryInfo.pickupLocation || deliveryInfo?.address?.physicalAddress?.line1;
    const requestIdentifiers = Array.isArray(illRequest.requestIdentifiers) ? illRequest.requestIdentifiers : [];

    return (
      <Accordion label={<FormattedMessage id="ui-rs.information.heading.request" />}>
      <Card
        headerStart={record.id}
        roundedBorder
      >
        <Row>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.hrid" />}
              value={record.requesterRequestId}
            />
          </Col>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.fullId" />}
              value={record.id}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.dateSubmitted" />}
              value={record.timestamp ? formattedDateTime(record.timestamp) : ''}
            />
          </Col>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.lastUpdated" />}
              value={record.timestamp ? formattedDateTime(record.timestamp) : ''}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.status" />}
            >
              {record.state ? <FormattedMessage id={`stripes-reshare.states.${record.state}`} defaultMessage={record.state} /> : ''}
            </KeyValue>
          </Col>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.requestingInstitution" />}
              value={record.requesterSymbol}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.flow.info.supplier" />}
              value={record.supplierSymbol}
            />
          </Col>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.dateNeeded" />}
              value={illRequest.neededBy ? <FormattedUTCDate value={illRequest.neededBy} /> : ''}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.pickupLocation" />}
              value={pickupLocation}
            />
          </Col>
        </Row>
        {deliveryInfo?.pickupUrl &&
          <Row>
            <Col xs={12}>
              <KeyValue
                label={<FormattedMessage id="ui-rs.information.pickupURL" />}
                value={deliveryInfo.pickupUrl}
              />
            </Col>
          </Row>
        }
        {requestIdentifiers.length > 0 &&
          <Row>
            <Col xs={12}>
              <KeyValue
                label={<FormattedMessage id="ui-rs.information.otherIdentifiers" />}
                value={requestIdentifiers.map(ident => `${ident.identifierType}: ${ident.identifier}`).join(', ')}
              />
            </Col>
          </Row>
        }
        <Row>
          <Col xs={12}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.notes" />}
              value={serviceInfo.note}
            />
          </Col>
        </Row>
      </Card>
      </Accordion>
    );
  }
}

export default RequestInfo;
