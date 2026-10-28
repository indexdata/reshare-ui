import React, { useState } from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import { useStripes } from '@folio/stripes/core';
import { Button, Col, Icon, Label, Layout, Loading, MessageBanner, Modal, ModalFooter, RadioButton, Row, TextArea, TextField } from '@folio/stripes/components';

import { useTenantInstitution } from '#/util/useOwnedEntries';

import { useInvalidateNotifications } from '../../chat/useNotifications';
import actionMeta from '../actionMeta';

const AddCondition = ({ request, performAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { institution, isSettled, isError } = useTenantInstitution({ enabled: isOpen });
  const conditions = (institution?.illConfig?.loanConditions ?? [])
    .filter(({ code }) => typeof code === 'string' && code.trim());
  const isLoading = isOpen && !isSettled;
  const hasCondition = value => !isLoading && !isError && conditions.some(({ code }) => code === value);
  const stripes = useStripes();
  const invalidateNotifications = useInvalidateNotifications(request?.id);
  const actionPending = !!useIsActionPending(request.id);
  const icon = actionMeta['add-condition']?.icon;
  const showCost = stripes.config?.reshare?.showCost
    && Number(request?.illRequest?.billingInfo?.maximumCosts?.monetaryValue) > 0;

  const getCost = cost => {
    if (!showCost || !cost?.trim()) return undefined;
    const numericCost = Number(cost);
    return Number.isFinite(numericCost) && numericCost >= 0 ? numericCost : undefined;
  };
  const hasUnavailableSelection = value => !!value && !hasCondition(value);
  const canSubmit = values => !isLoading && !hasUnavailableSelection(values.loanCondition)
    && (hasCondition(values.loanCondition) || getCost(values.cost) !== undefined);

  const onSubmit = async values => {
    const { loanCondition, note, cost } = values;
    if (actionPending || !canSubmit(values)) return undefined;
    const payload = { note };
    if (hasCondition(loanCondition)) {
      const selectedCondition = conditions.find(({ code }) => code === loanCondition);
      const description = selectedCondition.defaultDesc?.trim() ? selectedCondition.defaultDesc : selectedCondition.code;
      payload.loanCondition = loanCondition;
      // Preserve the supplier's description in both parties' notification notes.
      payload.note = note ? `${description}\n\n${note}` : description;
    }
    const numericCost = getCost(cost);
    if (numericCost !== undefined) {
      payload.cost = numericCost;
      payload.currency = stripes.currency;
    }

    try {
      await performAction('add-condition', payload, {
        success: 'ui-rs.actions.add-condition.success',
        error: 'ui-rs.actions.add-condition.error',
      });
      await invalidateNotifications();
      setIsOpen(false);
      return undefined;
    } catch (err) {
      return undefined;
    }
  };

  const validate = values => {
    if (canSubmit(values)) return {};

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
          render={({ handleSubmit, submitting, invalid, values, form }) => {
            return (
              <form onSubmit={handleSubmit}>
                <FormattedMessage
                  id="ui-rs.actions.add-condition.confirm"
                  values={{ id: request.requesterRequestId || request.id, item: request.illRequest?.bibliographicInfo?.title }}
                />
                {isLoading && <Loading />}
                {isError &&
                  <MessageBanner type="warning">
                    <FormattedMessage id="ui-rs.actions.add-condition.conditionsError" />
                  </MessageBanner>
                }
                {!isLoading && !isError && conditions.length === 0 &&
                  <MessageBanner type="warning">
                    <FormattedMessage id="ui-rs.actions.add-condition.noConditions" />
                  </MessageBanner>
                }
                {!isLoading && hasUnavailableSelection(values.loanCondition) &&
                  <MessageBanner type="warning">
                    <FormattedMessage id="ui-rs.actions.add-condition.unavailableSelection" />
                  </MessageBanner>
                }
                <Layout className="padding-top-gutter">
                  <Label>
                    <FormattedMessage id="ui-rs.actions.add-condition.condition" />
                  </Label>
                </Layout>
                <Row>
                  <Field
                    name="loanCondition"
                    render={({ input }) => conditions.map(({ code, defaultDesc }) => (
                      <Col key={code} xs={12}>
                        <RadioButton
                          disabled={submitting || isLoading || isError}
                          checked={input.value === code}
                          fullWidth
                          label={defaultDesc?.trim() ? defaultDesc : code}
                          marginBottom0
                          onChange={() => input.onChange(code)}
                          value={code}
                        />
                      </Col>
                    ))}
                  />
                </Row>
                {values.loanCondition &&
                  <Button
                    type="button"
                    disabled={submitting}
                    onClick={() => form.change('loanCondition', undefined)}
                  >
                    <FormattedMessage id="ui-rs.actions.add-condition.clearSelection" />
                  </Button>
                }
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
                  <Label><FormattedMessage id="ui-rs.actions.addNote" /></Label>
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
                    disabled={submitting || invalid || actionPending || !canSubmit(values)}
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
