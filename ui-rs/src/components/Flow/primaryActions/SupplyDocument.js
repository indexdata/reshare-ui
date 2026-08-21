import React from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { useIntlCallout, useIsActionPending } from '@projectreshare/stripes-reshare';
import { Button, Col, Label, Layout, Row, TextArea, TextField } from '@folio/stripes/components';
import { required } from '@folio/stripes/util';

const SupplyDocument = ({ performAction, request }) => {
  const sendCallout = useIntlCallout();
  const actionPending = !!useIsActionPending(request.id);

  const onSubmit = async values => {
    if (values?.reqId?.trim()?.toUpperCase() !== request.requesterRequestId?.toUpperCase()) {
      sendCallout('ui-rs.actions.wrongId', 'error');
      return false;
    }

    try {
      await performAction('supply-document', {
        deliveryUrl: values.deliveryUrl.trim(),
        note: values.note,
      }, {
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
          <Layout className="padding-top-gutter">
            <Field
              name="deliveryUrl"
              label={<FormattedMessage id="ui-rs.actions.supply-document.deliveryUrl" />}
              component={TextField}
              type="url"
              required
              autoFocus
            />
          </Layout>
          <Row>
            <Col xs={11}>
              <Field name="reqId" component={TextField} />
            </Col>
            <Col xs={1}>
              <Button buttonStyle="primary mega" type="submit" disabled={submitting || invalid || actionPending}>
                <FormattedMessage id="ui-rs.button.scan" />
              </Button>
            </Col>
          </Row>
          <Layout className="padding-top-gutter">
            <Label><FormattedMessage id="ui-rs.actions.addNote" /></Label>
          </Layout>
          <Row>
            <Col xs={12}>
              <Field name="note" component={TextArea} />
            </Col>
          </Row>
        </form>
      )}
    />
  );
};

export default SupplyDocument;
