import React from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import { Button, Col, Row, TextField } from '@folio/stripes/components';
import { required } from '@folio/stripes/util';
import AddNoteField from '../../AddNoteField';

const SupplyDocument = ({ performAction, request, withNote = false }) => {
  const intl = useIntl();
  const actionPending = !!useIsActionPending(request.id);

  const onSubmit = async values => {
    try {
      await performAction('supply-document', {
        deliveryUrl: values.deliveryUrl.trim(),
        ...(withNote ? { note: values.note } : {}),
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
          <Row>
            <Col xs={11}>
              <Field
                name="deliveryUrl"
                aria-label={intl.formatMessage({ id: 'ui-rs.actions.supply-document.deliveryUrl' })}
                component={TextField}
                type="url"
                required
                autoFocus
              />
            </Col>
            <Col xs={1}>
              <Button buttonStyle="primary mega" type="submit" disabled={submitting || invalid || actionPending}>
                <FormattedMessage id="stripes-reshare.actions.supply-document" />
              </Button>
            </Col>
          </Row>
          {withNote && <AddNoteField />}
        </form>
      )}
    />
  );
};

export default SupplyDocument;
