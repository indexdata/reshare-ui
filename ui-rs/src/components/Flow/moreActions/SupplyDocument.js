import React, { useState } from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import { Button, Col, Icon, Label, Layout, Modal, ModalFooter, Row, TextArea, TextField } from '@folio/stripes/components';
import { required } from '@folio/stripes/util';

import actionMeta from '../actionMeta';

const SupplyDocument = ({ request, performAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const actionPending = !!useIsActionPending(request.id);
  const icon = actionMeta['supply-document']?.icon;

  const onSubmit = async values => {
    try {
      await performAction('supply-document', {
        deliveryUrl: values.deliveryUrl.trim(),
        note: values.note,
      }, {
        success: 'ui-rs.actions.supply-document.success',
        error: 'ui-rs.actions.supply-document.error',
      });
      setIsOpen(false);
      return undefined;
    } catch (err) {
      return undefined;
    }
  };

  const validate = values => ({
    deliveryUrl: required(values.deliveryUrl?.trim()),
  });

  return (
    <>
      <Button buttonStyle="dropdownItem" onClick={() => setIsOpen(true)}>
        <Icon icon={icon}><FormattedMessage id="stripes-reshare.actions.supply-document" /></Icon>
      </Button>
      <Modal
        label={<FormattedMessage id="stripes-reshare.actions.supply-document" />}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        dismissible
      >
        <Form
          onSubmit={onSubmit}
          validate={validate}
          render={({ handleSubmit, submitting, invalid, form }) => (
            <form onSubmit={handleSubmit}>
              <FormattedMessage id="ui-rs.actions.supply-document.confirm" />
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
              <Layout className="padding-top-gutter">
                <Label><FormattedMessage id="ui-rs.actions.addNote" /></Label>
              </Layout>
              <Row>
                <Col xs={12}>
                  <Field name="note" component={TextArea} />
                </Col>
              </Row>
              <ModalFooter>
                <Button
                  buttonStyle="primary"
                  onClick={form.submit}
                  disabled={submitting || invalid || actionPending}
                >
                  <FormattedMessage id="stripes-reshare.actions.supply-document" />
                </Button>
                <Button onClick={() => setIsOpen(false)}>
                  <FormattedMessage id="ui-rs.button.goBack" />
                </Button>
              </ModalFooter>
            </form>
          )}
        />
      </Modal>
    </>
  );
};

export default SupplyDocument;
