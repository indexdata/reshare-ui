import React from 'react';
import { FormattedMessage } from 'react-intl';
import { FORM_ERROR } from 'final-form';
import { KeyValue } from '@folio/stripes/components';

// Return from onSubmit: Final Form then counts the submit as failed, which keeps
// the leave prompt armed.
const submissionError = (callout, labelId, err) => {
  callout.sendCallout({
    type: 'error',
    message: (
      <KeyValue
        label={<FormattedMessage id={labelId} />}
        value={err?.message || ''}
      />
    ),
  });
  return { [FORM_ERROR]: err?.message || labelId };
};

export default submissionError;
