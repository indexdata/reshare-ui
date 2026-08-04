import React, { useEffect, useMemo } from 'react';
import { Field, useField, useForm } from 'react-final-form';
import { FieldArray } from 'react-final-form-arrays';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Checkbox,
  Col,
  KeyValue,
  Label,
  RepeatableField,
  Row,
  Select,
  TextField,
} from '@folio/stripes/components';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';

import { templateLabelOptions } from '../../templates/mapping';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EmailField = (props) => <TextField type="email" {...props} />;

// The broker resolves the template itself, by owner + purpose + label + audience, and
// hardcodes these two; only the label is stored on the action.
const TEMPLATE_SCOPE = { purpose: 'email', audience: 'staff' };

const TemplateLabelField = ({ invalidMessage }) => {
  const intl = useIntl();
  const { data, isLoading } = useOkapiQuery('broker/templates', {
    searchParams: { limit: 100 },
  });
  const options = useMemo(
    () => templateLabelOptions(data?.items, TEMPLATE_SCOPE),
    [data],
  );
  const { input, meta } = useField('actionParams.templateLabel', {
    validate: (value) => (value ? undefined : invalidMessage),
  });

  // Presets may initialize a label the broker does not provide; clear it after options load.
  const { value, onChange } = input;
  useEffect(() => {
    if (isLoading || !value) return;
    if (!options.some(opt => opt.value === value)) onChange('');
  }, [isLoading, options, value, onChange]);

  if (isLoading) return null;

  if (options.length === 0) {
    return (
      <>
        <Label required>
          <FormattedMessage id="ui-rs.settings.scheduledActions.params.templateLabel" />
        </Label>
        <div>
          <FormattedMessage id="ui-rs.settings.scheduledActions.params.templateLabelNone" />
        </div>
      </>
    );
  }

  return (
    <Select
      id="scheduled-action-email-templateLabel"
      required
      dataOptions={[
        { value: '', label: intl.formatMessage({ id: 'ui-rs.settings.scheduledActions.params.templateLabelPlaceholder' }) },
        ...options,
      ]}
      label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.templateLabel" />}
      value={value}
      onChange={onChange}
      onBlur={input.onBlur}
      onFocus={input.onFocus}
      error={meta.touched ? meta.error : undefined}
    />
  );
};

const EmailPullslipsParams = () => {
  const intl = useIntl();
  const form = useForm();
  const msg = (id) => intl.formatMessage({ id: `ui-rs.settings.scheduledActions.validate.${id}` });

  // Show one recipient field instead of the repeatable field's empty state.
  useEffect(() => {
    const to = form.getState().values?.actionParams?.to;
    if (!Array.isArray(to) || to.length === 0) form.mutators.push('actionParams.to', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateRecipientCount = (value) => ((value?.length ?? 0) === 0 ? msg('recipients') : undefined);
  const validateEmail = (value) => (value && EMAIL.test(value.trim()) ? undefined : msg('recipientsInvalid'));

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
        <TemplateLabelField invalidMessage={msg('templateLabel')} />
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

export const EmailPullslipsView = ({ actionParams }) => (
  <>
    <KeyValue
      label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.to" />}
      value={(Array.isArray(actionParams?.to) ? actionParams.to : []).join(', ')}
    />
    <KeyValue
      label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.templateLabel" />}
      value={actionParams?.templateLabel}
    />
    <KeyValue
      label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.includePdf" />}
      value={<FormattedMessage id={actionParams?.includePdf ? 'ui-rs.yes' : 'ui-rs.no'} />}
    />
  </>
);
