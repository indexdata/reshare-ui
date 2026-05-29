import React from 'react';
import {
  Card,
  Col,
  KeyValue,
  Row,
} from '@folio/stripes/components';

import css from './CustomIdentifiers.css';

class CustomIdentifiersInfo extends React.Component {
  render() {
    const { record } = this.props;
    let identifiers = [];
    const { customIdentifiers } = record;
    let summary = '';
    if (customIdentifiers) {
      const parsedResponse = JSON.parse(customIdentifiers);
      if (parsedResponse.identifiers && parsedResponse.identifiers.length > 0) {
        identifiers = parsedResponse.identifiers;
      }
      if (parsedResponse.schemeValue) {
        summary = `${parsedResponse.schemeValue} identifiers`;
      }
    }

    if (identifiers && identifiers.length > 0) {
      return (
        <Card
          id={`${this.props.id}-card`}
          headerStart={summary}
          roundedBorder
          cardClass={css.citationMetadataCard}
          headerClass={css.citationMetadataCardHeader}
        >
          {identifiers.map(id => (
            <Row key={`${this.props.id}-${id.key}-${id.value}`}>
              <Col xs={6}>
                <KeyValue
                  label={id.key}
                  value={id.value}
                />
              </Col>
            </Row>
          ))}
        </Card>
      );
    } else {
      return (<></>);
    }
  }
}

export default CustomIdentifiersInfo;
