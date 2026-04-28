import React, { useState } from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import { useStripes } from '@folio/stripes/core';
import { Button, Col, Icon, Label, Layout, Modal, ModalFooter, RadioButton, Row, TextArea, TextField } from '@folio/stripes/components';

import { useInvalidateNotifications } from '../../chat/useNotifications';
import { actionMeta } from '../actionMeta';
import { LoanCondition } from '../../../constants/iso18626';

const AddCondition = ({ request, performAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const intl = useIntl();
  const stripes = useStripes();
  const invalidateNotifications = useInvalidateNotifications(request?.id);
  const actionPending = !!useIsActionPending(request.id);
  const icon = actionMeta['add-condition']?.icon;
  const showCost = stripes.config?.reshare?.showCost
    && Number(request?.illRequest?.billingInfo?.maximumCosts?.monetaryValue) > 0;

  const onSubmit = values => {
    const { loanCondition, note, cost } = values;
    const payload = { loanCondition, note };
    const numericCost = !cost?.trim() ? undefined : Number(cost);
    if (Number.isFinite(numericCost)) {
      payload.cost = numericCost;
      payload.currency = stripes.currency;
    }
    return performAction('add-condition', payload, {
      success: 'ui-rs.actions.add-condition.success',
      error: 'ui-rs.actions.add-condition.error',
    })
      .then(() => {
        return invalidateNotifications();
      })
      .then(() => {
        setIsOpen(false);
      });
  };

  const validate = values => {
    const hasCondition = !!values.loanCondition;
    const hasCost = showCost && !!values.cost?.trim();

    if (hasCondition || hasCost) return {};

    return {
      loanCondition: true,
      cost: true,
    };
  };

  return (
    <>
      <Button buttonStyle="dropdownItem" onClick={() => setIsOpen(true)}>
        <Icon icon={icon}><FormattedMessage id="stripes-reshare.actions.add-condition" /></Icon>
      </Button>
      <Modal
        label={<FormattedMessage id="stripes-reshare.actions.add-condition" />}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        dismissible
      >
        <Form
          onSubmit={onSubmit}
          validate={validate}
          render={({ handleSubmit, submitting, invalid, form }) => {
            return (
              <form onSubmit={handleSubmit}>
                <FormattedMessage
                  id="ui-rs.actions.add-condition.confirm"
                  values={{ id: request.requesterRequestId || request.id, item: request.illRequest?.bibliographicInfo?.title }}
                />
                <Layout className="padding-top-gutter">
                  <Label>
                    <FormattedMessage id="ui-rs.actions.add-condition.condition" />
                  </Label>
                </Layout>
                <Row>
                  <Field
                    name="loanCondition"
                    render={({ input }) => LoanCondition.map(value => (
                      <Col key={value} xs={12}>
                        <RadioButton
                          checked={input.value === value}
                          fullWidth
                          label={intl.formatMessage({ id: `ui-rs.iso18626.LoanCondition.${value}`, defaultMessage: value })}
                          marginBottom0
                          onChange={() => input.onChange(value)}
                          value={value}
                        />
                      </Col>
                    ))}
                  />
                </Row>
                {showCost && (
                  <Layout className="padding-top-gutter">
                    <Field
                      name="cost"
                      label={<FormattedMessage id="ui-rs.flow.loanConditions.cost" />}
                      component={TextField}
                      type="number"
                      step="0.01"
                      min="0"
                    />
                  </Layout>
                )}
                <Layout className="padding-top-gutter">
                  <strong><FormattedMessage id="ui-rs.actions.addNote" /></strong>
                </Layout>
                <Row>
                  <Col xs={11}>
                    <Field name="note" component={TextArea} autoFocus />
                  </Col>
                </Row>
                <ModalFooter>
                  <Button
                    buttonStyle="primary"
                    onClick={form.submit}
                    disabled={submitting || invalid || actionPending}
                  >
                    <FormattedMessage id="stripes-reshare.actions.add-condition" />
                  </Button>
                  <Button onClick={() => setIsOpen(false)}>
                    <FormattedMessage id="ui-rs.button.goBack" />
                  </Button>
                </ModalFooter>
              </form>
            );
          }}
        />
      </Modal>
    </>
  );
};

export default AddCondition;
