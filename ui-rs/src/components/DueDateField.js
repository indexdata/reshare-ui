import React from 'react';
import { Field } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { AppValidatedDatepicker } from '@folio/stripes/components';

export const validateDueDate = value => {
  if (!value) return undefined;
  // Round-trip through Date so JS-normalized dates (February 30) fail too.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
  const valid = date && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  return valid ? undefined : <FormattedMessage id="ui-rs.actions.dueDate.invalid" />;
};

// YYYY-MM-DD is interpreted as the end of the supplier's day by the broker.
// The default Datepicker turns invalid input into '', which compactParams would
// drop, so a typo would submit as an omitted date. AppValidatedDatepicker passes
// the text through to Final Form instead, where validateDueDate reports it.
const DueDateField = ({ label, help }) => (
  <>
    <Field
      name="dueDate"
      label={label}
      component={AppValidatedDatepicker}
      backendDateStandard="YYYY-MM-DD"
      validate={validateDueDate}
      usePortal
    />
    {help}
  </>
);

export default DueDateField;
