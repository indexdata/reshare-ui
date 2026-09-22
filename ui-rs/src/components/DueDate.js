import React from 'react';
import { FormattedTime, NoValue } from '@folio/stripes/components';

const DueDate = ({ value }) => {
  if (!value) return <NoValue />;
  return (
    <FormattedTime
      value={value}
      year="numeric"
      month="numeric"
      day="numeric"
      hour="numeric"
      minute="numeric"
      timeZoneName="short"
    />
  );
};

export default DueDate;
