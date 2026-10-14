import React, { useState } from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import { Button, Layout, TextField } from '@folio/stripes/components';
import { required } from '@folio/stripes/util';
import { noteParam } from '../../AddNoteField';
import DocumentUpload from '../DocumentUpload';
import OptionalParams from '../OptionalParams';

const SupplyDocument = ({ performAction, request, withNote = false }) => {
  const intl = useIntl();
  const actionPending = !!useIsActionPending(request.id);
  const [uploading, setUploading] = useState(false);

  const onSubmit = async values => {
    try {
      await performAction('supply-document', { deliveryUrl: values.deliveryUrl.trim(), note: values.note }, {
        success: 'ui-rs.actions.supply-document.success',
        error: 'ui-rs.actions.supply-document.error',
      });
      return undefined;
    } catch (err) {
      return undefined;
    }
  };

  const validate = values => ({
    deliveryUrl: required(values.deliveryUrl?.trim()),
  });

  return (
    <Form
      onSubmit={onSubmit}
      validate={validate}
      render={({ handleSubmit, submitting, invalid }) => (
        <form onSubmit={handleSubmit} autoComplete="off">
          <FormattedMessage id="ui-rs.actions.supply-document.prompt" />
          <Layout className="display-flex flex-align-items-start">
            <Field
              name="deliveryUrl"
              aria-label={intl.formatMessage({ id: 'ui-rs.actions.supply-document.deliveryUrl' })}
              component={TextField}
              type="url"
              required
              autoFocus
            />
            <Layout className="margin-start-gutter">
              <Button buttonStyle="primary mega" type="submit" disabled={submitting || invalid || actionPending || uploading}>
                <FormattedMessage id="stripes-reshare.actions.supply-document" />
              </Button>
            </Layout>
          </Layout>
          <DocumentUpload name="deliveryUrl" disabled={submitting || actionPending} onUploadingChange={setUploading} />
          {withNote && <OptionalParams params={[noteParam]} />}
        </form>
      )}
    />
  );
};

export default SupplyDocument;
