import React from 'react';
import { Field } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { Checkbox } from '@folio/stripes/components';

// Per-action settings for the `email-pullslips` action (display: "Email pull slips").
// Renders into the namespaced actionParams.* so action types can't collide.
const EmailPullslipsParams = () => (
  <Field
    id="scheduled-action-attachPdf"
    name="actionParams.attachPdf"
    type="checkbox"
    component={Checkbox}
    label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.attachPdf" />}
  />
);

export default EmailPullslipsParams;
