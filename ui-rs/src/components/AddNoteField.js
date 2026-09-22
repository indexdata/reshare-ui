import React from 'react';
import { Field } from 'react-final-form';
import { TextField } from '@folio/stripes/components';
import { FormattedMessage } from 'react-intl';

const AddNoteField = () => (
  <Field
    name="note"
    label={<FormattedMessage id="ui-rs.actions.note" />}
    component={TextField}
    autoFocus
  />
);

export const noteParam = {
  name: 'note',
  label: <FormattedMessage id="ui-rs.actions.addNote" />,
  openLabel: <FormattedMessage id="ui-rs.actions.removeNote" />,
  field: <AddNoteField />,
};

export default AddNoteField;
