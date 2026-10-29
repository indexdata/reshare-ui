import React, { useEffect } from 'react';
import { Field, useForm, useFormState } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { Layout, Select } from '@folio/stripes/components';
import { required as validateRequired } from '@folio/stripes/util';

const DirectoryReasonField = ({ name, labelId, placeholderId, reasons, disabled, required = false }) => {
  const intl = useIntl();
  const form = useForm();
  const { values } = useFormState({ subscription: { values: true } });
  const reason = values[name];

  useEffect(() => {
    if (reason && !reasons.some(({ code }) => code === reason)) {
      form.change(name, undefined);
    }
  }, [form, name, reason, reasons]);

  if (reasons.length === 0) return null;

  return (
    <Layout className="padding-top-gutter">
      <Field
        name={name}
        component={Select}
        label={<FormattedMessage id={labelId} />}
        dataOptions={[
          { value: '', label: intl.formatMessage({ id: placeholderId }) },
          ...reasons.map(({ code, defaultDesc }) => ({ value: code, label: defaultDesc })),
        ]}
        disabled={disabled}
        required={required}
        validate={required ? validateRequired : undefined}
      />
    </Layout>
  );
};

export default DirectoryReasonField;
