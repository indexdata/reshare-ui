import React, { useEffect } from 'react';
import { Field, useForm } from 'react-final-form';
import { FieldArray } from 'react-final-form-arrays';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Checkbox,
  Col,
  KeyValue,
  Label,
  RepeatableField,
  Row,
  TextArea,
  TextField,
} from '@folio/stripes/components';

// Per-action settings for the `email-pullslips` action
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EmailField = (props) => <TextField type="email" {...props} />;

const EmailPullslipsParams = () => {
  const intl = useIntl();
  const form = useForm();
  const msg = (id) => intl.formatMessage({ id: `ui-rs.settings.scheduledActions.validate.${id}` });

  // Start with one empty recipient row so the field is visible and labelled up
  // front, rather than an empty-state message. Runs on mount (including when the
  // action is switched to email-pullslips); leaves a loaded recipient list alone.
  useEffect(() => {
    const to = form.getState().values?.actionParams?.to;
    if (!Array.isArray(to) || to.length === 0) form.mutators.push('actionParams.to', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The broker requires at least one recipient and rejects malformed addresses.
  // Surface the per-address check on each row, and the "at least one" rule on the
  // array as a whole, rather than letting either fail at run time.
  const validateRecipientCount = (value) => ((value?.length ?? 0) === 0 ? msg('recipients') : undefined);
  const validateEmail = (value) => (value && EMAIL.test(value.trim()) ? undefined : msg('recipientsInvalid'));
  const validateRequired = (id) => (value) => (value && value.trim() ? undefined : msg(id));

  return (
    <Row>
      <Col xs={12} md={6}>
        <FieldArray
          name="actionParams.to"
          component={RepeatableField}
          headLabels={(
            <Label required>
              <FormattedMessage id="ui-rs.settings.scheduledActions.params.to" />
            </Label>
          )}
          addLabel={<FormattedMessage id="ui-rs.settings.scheduledActions.params.addRecipient" />}
          onAdd={fields => fields.push('')}
          hasMargin={false}
          validate={validateRecipientCount}
          renderField={field => (
            <Field
              id={`scheduled-action-email-to-${field}`}
              name={field}
              component={EmailField}
              validate={validateEmail}
            />
          )}
        />
      </Col>
      <Col xs={12} md={6}>
        <Field
          id="scheduled-action-email-subject"
          name="actionParams.subject"
          component={TextField}
          required
          validate={validateRequired('subject')}
          label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.subject" />}
        />
        <Field
          id="scheduled-action-email-body"
          name="actionParams.body"
          component={TextArea}
          rows={5}
          required
          validate={validateRequired('body')}
          label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.body" />}
        />
        <Field
          id="scheduled-action-email-includePdf"
          name="actionParams.includePdf"
          type="checkbox"
          component={Checkbox}
          label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.includePdf" />}
        />
      </Col>
    </Row>
  );
};

export { EmailPullslipsParams };

// Read-only counterpart for the detail view.
export const EmailPullslipsView = ({ actionParams }) => (
  <>
    <KeyValue
      label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.to" />}
      value={(Array.isArray(actionParams?.to) ? actionParams.to : []).join(', ')}
    />
    <KeyValue
      label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.subject" />}
      value={actionParams?.subject}
    />
    <KeyValue
      label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.body" />}
      value={actionParams?.body}
    />
    <KeyValue
      label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.includePdf" />}
      value={<FormattedMessage id={actionParams?.includePdf ? 'ui-rs.yes' : 'ui-rs.no'} />}
    />
  </>
);
