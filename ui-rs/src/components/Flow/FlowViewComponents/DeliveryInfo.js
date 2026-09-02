import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Accordion, Button, Col, Icon, KeyValue, Row } from '@folio/stripes/components';
import { useIntlCallout } from '@projectreshare/stripes-reshare';

// The broker sends a delivered copy as sentVia=URL with the URL in itemId; ISO 18626
// has no element of its own for it.
const deliveredUrl = (deliveryInfo) => {
  if (deliveryInfo?.sentVia?.['#text']?.toUpperCase() !== 'URL') return null;
  const itemId = deliveryInfo.itemId;
  if (!itemId) return null;
  // A peer's URL reaches us unvalidated, so anything but http(s) is not linked.
  try {
    const { protocol } = new URL(itemId);
    if (protocol !== 'http:' && protocol !== 'https:') return null;
  } catch (e) {
    return null;
  }
  return itemId;
};

const DeliveryInfo = ({ request }) => {
  const intl = useIntl();
  const sendCallout = useIntlCallout();

  const url = deliveredUrl(request?.illResponse?.deliveryInfo);
  if (request?.illRequest?.serviceInfo?.serviceType !== 'Copy' || !url) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      sendCallout('stripes-components.copied');
    } catch (e) {
      sendCallout('ui-rs.flow.info.copyDeliveryUrlError', 'error');
    }
  };

  return (
    <Accordion
      id="deliveryInfo"
      label={<FormattedMessage id="ui-rs.flow.sections.deliveryInfo" />}
    >
      <Row>
        <Col xs={12}>
          <KeyValue label={<FormattedMessage id="ui-rs.information.deliveryUrl" />}>
            <a target="_blank" rel="noopener noreferrer" href={url}>{url}</a>
            {/* Absent outside a secure context, where writeText would only ever reject. */}
            {navigator.clipboard &&
              <Button
                buttonStyle="none"
                marginBottom0
                onClick={copy}
                aria-label={intl.formatMessage({ id: 'ui-rs.flow.info.copyDeliveryUrl' })}
              >
                <Icon icon="clipboard" />
              </Button>
            }
          </KeyValue>
        </Col>
      </Row>
    </Accordion>
  );
};

export default DeliveryInfo;
