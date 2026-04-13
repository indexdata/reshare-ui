import React, { useState } from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import { Button, Col, Icon, Layout, Modal, ModalFooter, RadioButton, Row, TextArea } from '@folio/stripes/components';
import { required } from '@folio/stripes/util';

import { actionMeta } from './actionMeta';

const ActionReasonButton = ({ action, reasons, reasonField, reasonTranslationPrefix, request, performAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const intl = useIntl();
  const actionPending = !!useIsActionPending(request.id);
  const icon = actionMeta[action]?.icon;

  const onSubmit = values => {
    return performAction(action, values, {
      success: `ui-rs.actions.${action}.success`,
      error: `ui-rs.actions.${action}.error`,
    })
      .then(() => setIsOpen(false));
  };

  return (
    <>
      <Button buttonStyle="dropdownItem" onClick={() => setIsOpen(true)}>
        <Icon icon={icon}><FormattedMessage id={`ui-rs.actions.${action}`} /></Icon>
      </Button>
      <Modal
        label={<FormattedMessage id={`ui-rs.actions.${action}`} />}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        dismissible
      >
        <Form
          onSubmit={onSubmit}
          render={({ handleSubmit, submitting, pristine, form }) => (
            <form onSubmit={handleSubmit}>
              <FormattedMessage id={`ui-rs.actions.${action}.confirm`} values={{ id: (request.hrid || request.id), item: request.title }} />
              <Layout className="padding-top-gutter">
                <strong><FormattedMessage id={`ui-rs.actions.${action}.reason`} /></strong>
              </Layout>
              <Row>
                <Field
                  name={reasonField}
                  validate={required}
                  render={({ input }) => reasons.map(value => (
                    <Col key={value} xs={12}>
                      <RadioButton
                        checked={input.value === value}
                        fullWidth
                        label={intl.formatMessage({ id: `${reasonTranslationPrefix}.${value}`, defaultMessage: value })}
                        marginBottom0
                        onChange={() => input.onChange(value)}
                        value={value}
                      />
                    </Col>
                  ))}
                />
              </Row>
              <Layout className="padding-top-gutter">
                <strong><FormattedMessage id="ui-rs.actions.addNote" /></strong>
              </Layout>
              <Row>
                <Col xs={11}>
                  <Field name="note" component={TextArea} autoFocus />
                </Col>
              </Row>
              <ModalFooter>
                <Button buttonStyle="danger" onClick={form.submit} disabled={submitting || pristine || actionPending}>
                  <FormattedMessage id={`ui-rs.actions.${action}`} />
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

export default ActionReasonButton;
