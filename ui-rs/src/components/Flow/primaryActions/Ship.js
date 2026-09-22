import React from 'react';
import { FormattedMessage } from 'react-intl';
import Generic from './Generic';
import DueDateField from '../../DueDateField';

const dueDateParam = {
  name: 'dueDate',
  label: <FormattedMessage id="ui-rs.actions.overrideDueDate" />,
  openLabel: <FormattedMessage id="ui-rs.actions.removeDueDateOverride" />,
  field: (
    <DueDateField
      label={<FormattedMessage id="ui-rs.flow.info.dueDate" />}
      help={<FormattedMessage id="ui-rs.actions.ship.dueDate.help" />}
    />
  ),
};

const Ship = ({ parameters = [], ...props }) => (
  <Generic
    {...props}
    buildActionParams={values => ({ note: values.note, dueDate: values.dueDate })}
    params={parameters.includes('dueDate') ? [dueDateParam] : []}
  />
);

export default Ship;
