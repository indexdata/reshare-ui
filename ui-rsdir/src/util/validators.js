import React from 'react';
import { FormattedMessage } from 'react-intl';
import { isValidLendToBorrowRatio } from './lendToBorrowRatio';

const required = value => (
  !value ? <FormattedMessage id="stripes-core.label.missingRequiredField" /> : undefined
);

const requiredValue = value => (
  value === undefined || value === null || value === ''
    ? <FormattedMessage id="stripes-core.label.missingRequiredField" />
    : undefined
);

const lendToBorrowRatio = value => (
  isValidLendToBorrowRatio(value)
    ? undefined
    : <FormattedMessage id="ui-rsdir.entry.lendToBorrowRatio.invalid" />
);

export {
  required,
  requiredValue,
  lendToBorrowRatio,
};
