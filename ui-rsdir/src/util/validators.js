import React from 'react';
import { FormattedMessage } from 'react-intl';

const required = value => (
  !value ? <FormattedMessage id="stripes-core.label.missingRequiredField" /> : undefined
);

const requiredValue = value => (
  value === undefined || value === null || value === ''
    ? <FormattedMessage id="stripes-core.label.missingRequiredField" />
    : undefined
);

export {
  required,
  requiredValue,
};
