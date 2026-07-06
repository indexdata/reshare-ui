import React, { useState } from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import { Button, Col, Icon, Layout, Modal, ModalFooter, RadioButton, Row, TextArea, TextField } from '@folio/stripes/components';
import { required } from '@folio/stripes/util';

import actionMeta from '../actionMeta';
import { SupportedReasonRetry } from '../../../constants/iso18626';

const AskRetry = ({ request, performAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const intl = useIntl();
  const actionPending = !!useIsActionPending(request.id);
  const icon = actionMeta['ask-retry']?.icon;

  const onSubmit = async values => {
    const { reasonRetry, note } = values;
    // itemId becomes ISO18626 DeliveryInfo.ItemId on the wire; trim so a pasted
    // value with surrounding whitespace doesn't reach the broker.
    const itemId = values.itemId?.trim();
    try {
      await performAction('ask-retry', { reasonRetry, itemId, note }, {
        success: 'ui-rs.actions.ask-retry.success',
        error: 'ui-rs.actions.ask-retry.error',
      });
      setIsOpen(false);
      return undefined;
    } catch (err) {
      return undefined;
    }
  };

  const validate = values => ({
    reasonRetry: required(values.reasonRetry),
    itemId: values.reasonRetry === 'NotFoundAsCited' ? required(values.itemId?.trim()) : undefined,
  });

  return (
    <>
      <Button buttonStyle="dropdownItem" onClick={() => setIsOpen(true)}>
        <Icon icon={icon}><FormattedMessage id="ui-rs.actions.ask-retry" /></Icon>
      </Button>
      <Modal
        label={<FormattedMessage id="ui-rs.actions.ask-retry" />}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        dismissible
      >
        <Form
          onSubmit={onSubmit}
          validate={validate}
          initialValues={{ reasonRetry: SupportedReasonRetry.length === 1 ? SupportedReasonRetry[0] : undefined }}
          render={({ handleSubmit, submitting, invalid, form }) => (
            <form onSubmit={handleSubmit}>
              <Layout className="padding-top-gutter">
                <strong><FormattedMessage id="ui-rs.actions.ask-retry.reason" /></strong>
              </Layout>
              <Row>
                <Field
                  name="reasonRetry"
                  render={({ input }) => SupportedReasonRetry.map(value => (
                    <Col key={value} xs={12}>
                      <RadioButton
                        checked={input.value === value}
                        fullWidth
                        label={intl.formatMessage({ id: `ui-rs.iso18626.ReasonRetry.${value}`, defaultMessage: value })}
                        marginBottom0
                        onChange={() => input.onChange(value)}
                        value={value}
                      />
                    </Col>
                  ))}
                />
              </Row>
              <Layout className="padding-top-gutter">
                <Field
                  name="itemId"
                  label={<FormattedMessage id="ui-rs.actions.ask-retry.itemId" />}
                  component={TextField}
                  required
                  autoFocus
                />
              </Layout>
              <Layout className="padding-top-gutter">
                <strong><FormattedMessage id="ui-rs.actions.addNote" /></strong>
              </Layout>
              <Row>
                <Col xs={11}>
                  <Field name="note" component={TextArea} />
                </Col>
              </Row>
              <ModalFooter>
                <Button
                  buttonStyle="primary"
                  onClick={form.submit}
                  disabled={submitting || invalid || actionPending}
                >
                  <FormattedMessage id="ui-rs.actions.ask-retry" />
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

export default AskRetry;
