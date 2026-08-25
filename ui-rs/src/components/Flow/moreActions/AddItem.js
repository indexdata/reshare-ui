import React, { useState } from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import { Button, Col, Icon, Layout, Modal, ModalFooter, Row, TextField } from '@folio/stripes/components';
import { required } from '@folio/stripes/util';

import actionMeta from '../actionMeta';

const OPTIONAL_FIELDS = ['callNumber', 'title'];

// Manual attachment of an item, for when the LMS hasn't supplied one. Only the
// barcode is required; broker falls back to the request's own title when we
// send no title, so blank fields are omitted rather than sent empty.
// The action's itemId parameter is left unsent: broker fills that column with the
// request's own supplierUniqueRecordId and nothing reads it back, so asking for it
// here would only duplicate the identifier already shown on the request.
const AddItem = ({ request, performAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const actionPending = !!useIsActionPending(request.id);
  const icon = actionMeta['add-item']?.icon;

  const onSubmit = async values => {
    const payload = { barcode: values.barcode.trim() };
    OPTIONAL_FIELDS.forEach(field => {
      const value = values[field]?.trim();
      if (value) payload[field] = value;
    });

    try {
      await performAction('add-item', payload);
      setIsOpen(false);
      return undefined;
    } catch (err) {
      return undefined;
    }
  };

  const validate = values => ({
    barcode: required(values.barcode?.trim()),
  });

  return (
    <>
      <Button buttonStyle="dropdownItem" onClick={() => setIsOpen(true)}>
        <Icon icon={icon}><FormattedMessage id="stripes-reshare.actions.add-item" /></Icon>
      </Button>
      <Modal
        label={<FormattedMessage id="stripes-reshare.actions.add-item" />}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        dismissible
      >
        <Form
          onSubmit={onSubmit}
          validate={validate}
          render={({ handleSubmit, submitting, invalid, form }) => (
            <form onSubmit={handleSubmit}>
              <Layout>
                <Row>
                  <Col xs={12} md={6}>
                    <Field
                      name="barcode"
                      label={<FormattedMessage id="ui-rs.flow.volumes.itemBarcode" />}
                      component={TextField}
                      required
                      autoFocus
                    />
                  </Col>
                  <Col xs={12} md={6}>
                    <Field
                      name="callNumber"
                      label={<FormattedMessage id="ui-rs.flow.volumes.callNumber" />}
                      component={TextField}
                    />
                  </Col>
                </Row>
                <Row>
                  <Col xs={12}>
                    <Field
                      name="title"
                      label={<FormattedMessage id="ui-rs.flow.volumes.title" />}
                      component={TextField}
                    />
                  </Col>
                </Row>
              </Layout>
              <ModalFooter>
                <Button
                  buttonStyle="primary"
                  onClick={form.submit}
                  disabled={submitting || invalid || actionPending}
                >
                  <FormattedMessage id="stripes-reshare.actions.add-item" />
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

export default AddItem;
