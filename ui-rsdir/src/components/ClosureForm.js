import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Field } from 'react-final-form';
import {
  Col,
  Datepicker,
  Row,
  TextField,
} from '@folio/stripes/components';
import { required } from '../util/validators';

// Datepicker defaults to datetimes, but the API accepts date-only strings.
const DATE_STANDARD = 'YYYY-MM-DD';

const ClosureForm = () => {
  return (
    <>
      <Row>
        <Col xs={12}>
          <Field
            name="reason"
            component={TextField}
            label={<FormattedMessage id="ui-rsdir.closure.reason" />}
            required
            validate={required}
          />
        </Col>
      </Row>
      <Row>
        <Col xs={6}>
          <Field
            name="startDate"
            component={Datepicker}
            backendDateStandard={DATE_STANDARD}
            label={<FormattedMessage id="ui-rsdir.closure.startDate" />}
            required
            validate={required}
            usePortal
          />
        </Col>
        <Col xs={6}>
          <Field
            name="endDate"
            component={Datepicker}
            backendDateStandard={DATE_STANDARD}
            label={<FormattedMessage id="ui-rsdir.closure.endDate" />}
            required
            validate={required}
            usePortal
          />
        </Col>
      </Row>
    </>
  );
};

// The API does not reject reversed date ranges.
export const validateClosure = ({ startDate, endDate }) => {
  if (startDate && endDate && endDate < startDate) {
    return { endDate: <FormattedMessage id="ui-rsdir.closure.endBeforeStart" /> };
  }

  return {};
};

export default ClosureForm;
