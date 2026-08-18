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

const RequestInfo = ({ record = {} }) => {
  const illRequest = record.illRequest || {};
  const serviceInfo = illRequest.serviceInfo || {};
  const deliveryInfo = illRequest.deliveryInfo || {};
  const pickupLocation = deliveryInfo.pickupLocation || deliveryInfo?.address?.physicalAddress?.line1;

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
              value={record.createdAt ? formattedDateTime(record.createdAt) : ''}
            />
          </Col>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.information.lastUpdated" />}
              value={record.updatedAt ? formattedDateTime(record.updatedAt) : ''}
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
              value={serviceInfo.needBeforeDate ? <FormattedUTCDate value={serviceInfo.needBeforeDate} /> : ''}
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
};

export default RequestInfo;
