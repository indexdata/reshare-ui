import React, { useState } from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import { Button, Col, Icon, KeyValue, Label, Layout, Modal, ModalFooter, Row, TextArea } from '@folio/stripes/components';

import actionMeta from '../actionMeta';
import DueDateField from '../../DueDateField';
import DueDate from '../../DueDate';
import { compactParams } from '../ScanConfirmAction';

const Recall = ({ request, performAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const actionPending = !!useIsActionPending(request.id);
  const icon = actionMeta.recall.icon;

  const onSubmit = async values => {
    try {
      await performAction('recall', compactParams({ dueDate: values.dueDate, note: values.note }), {
        success: 'stripes-reshare.actions.recall.success',
        error: 'stripes-reshare.actions.recall.error',
      });
      setIsOpen(false);
      return undefined;
    } catch (err) {
      return undefined;
    }
  };

  return (
    <>
      <Button buttonStyle="dropdownItem" onClick={() => setIsOpen(true)}>
        <Icon icon={icon}><FormattedMessage id="stripes-reshare.actions.recall" /></Icon>
      </Button>
      <Modal
        label={<FormattedMessage id="stripes-reshare.actions.recall" />}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        dismissible
      >
        <Form
          onSubmit={onSubmit}
          render={({ handleSubmit, submitting, invalid, form }) => (
            <form onSubmit={handleSubmit}>
              <KeyValue
                label={<FormattedMessage id="ui-rs.flow.info.dueDate.current" />}
                value={<DueDate value={request.dueDate} />}
              />
              <DueDateField
                label={<FormattedMessage id="ui-rs.actions.recall.newDueDate" />}
                help={<FormattedMessage id="ui-rs.actions.recall.dueDate.help" />}
              />
              <Layout className="padding-top-gutter">
                <Label><FormattedMessage id="ui-rs.actions.note" /></Label>
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
                  <FormattedMessage id="stripes-reshare.actions.recall" />
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

export default Recall;
