import React from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Accordion,
  AccordionSet,
  Button,
  Col,
  MessageBanner,
  Pane,
  PaneFooter,
  Row,
  Select,
  TextField,
} from '@folio/stripes/components';

import DaysOfWeek from './schedule/DaysOfWeek/DaysOfWeek';
import { isHourListValid, isMinuteValid } from './schedule/scheduleExpression';
import actionRegistry from './actions/actionRegistry';
import css from './ScheduledActionForm.css';

// The common form. The top row pairs the action-type selector with the query;
// a Schedule section holds the days + times; then the per-action params block
// chosen from the registry by the current actionName. Create/Edit supply
// initialValues + onSubmit + labels. Renders a bare Pane — the settings
// framework provides the enclosing Paneset.
const ScheduledActionForm = ({ initialValues, onSubmit, onClose, title, submitLabelId, submitting, editing, unsupportedSchedule }) => {
  const intl = useIntl();
  const actionOptions = Object.keys(actionRegistry).map(name => ({
    value: name,
    label: intl.formatMessage({ id: `ui-rs.settings.scheduledActions.action.${name}` }),
  }));

  // A schedule needs a query, at least one day and one hour, and a minute < 60
  // (blank minute defaults to 0). Empty days would otherwise emit an RRULE that
  // fires weekly on an arbitrary weekday rather than "every day", so we require
  // an explicit selection.
  const msg = (id) => intl.formatMessage({ id: `ui-rs.settings.scheduledActions.validate.${id}` });
  const validate = (values) => {
    const errors = {};
    if (!values.batchQuery || !values.batchQuery.trim()) errors.batchQuery = msg('batchQuery');
    if (!values.days || values.days.length === 0) errors.days = msg('days');
    const hours = (values.hours ?? '').toString().trim();
    if (!hours) errors.hours = msg('hoursRequired');
    else if (!isHourListValid(hours)) errors.hours = msg('hoursInvalid');
    if (!isMinuteValid(values.minute)) errors.minute = msg('minute');
    return errors;
  };

  return (
    <Form
      onSubmit={onSubmit}
      initialValues={initialValues}
      validate={validate}
    >
      {({ handleSubmit, values, pristine, invalid, form }) => {
        const ParamsComponent = actionRegistry[values?.actionName];
        const footer = (
          <PaneFooter
            renderStart={
              <Button
                id="clickable-cancel-scheduled-action"
                buttonStyle="default mega"
                marginBottom0
                onClick={onClose}
              >
                <FormattedMessage id="stripes-core.button.cancel" />
              </Button>
            }
            renderEnd={
              <Button
                id="clickable-save-scheduled-action"
                type="submit"
                buttonStyle="primary mega"
                disabled={pristine || invalid || submitting}
                onClick={handleSubmit}
                marginBottom0
              >
                <FormattedMessage id={submitLabelId} />
              </Button>
            }
          />
        );
        return (
          <Pane
            defaultWidth="fill"
            paneTitle={title}
            onClose={onClose}
            dismissible
            footer={footer}
          >
            <form id="scheduled-action-form" onSubmit={handleSubmit}>
              {/* The loaded schedule is an RRULE this form can't represent; the
                  fields below were reset to empty, so saving overwrites it. */}
              {unsupportedSchedule && (
                <MessageBanner type="warning">
                  <FormattedMessage
                    id="ui-rs.settings.scheduledActions.unsupportedSchedule"
                    values={{ schedule: unsupportedSchedule }}
                  />
                </MessageBanner>
              )}
              <Row>
                <Col xs={12} md={4}>
                  <Field name="actionName">
                    {({ input }) => (
                      <Select
                        id="scheduled-action-actionName"
                        dataOptions={actionOptions}
                        // PUT has no actionName: a task's action type is fixed once created.
                        disabled={editing}
                        label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.actionName" />}
                        value={input.value}
                        onBlur={input.onBlur}
                        onFocus={input.onFocus}
                        onChange={(e) => {
                          // params are owned by the action type; drop the prior
                          // action's keys so we never submit foreign actionParams
                          input.onChange(e);
                          form.change('actionParams', {});
                        }}
                      />
                    )}
                  </Field>
                </Col>
                <Col xs={12} md={8}>
                  <Field
                    id="scheduled-action-batchQuery"
                    name="batchQuery"
                    required
                    component={TextField}
                    label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.batchQuery" />}
                  />
                </Col>
              </Row>

              <AccordionSet>
                <Accordion
                  id="scheduled-action-schedule"
                  label={<FormattedMessage id="ui-rs.settings.scheduledActions.schedule" />}
                >
                  <Row>
                    <Col xs={12} md={8}>
                      <Field
                        id="scheduled-action-days"
                        name="days"
                        required
                        component={DaysOfWeek}
                        label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.days" />}
                      />
                    </Col>
                    <Col xs={12} md={4}>
                      <Field
                        id="scheduled-action-hours"
                        name="hours"
                        required
                        marginBottom0
                        aria-describedby="scheduled-action-hours-help"
                        component={TextField}
                        label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.hours" />}
                      />
                      <div id="scheduled-action-hours-help" className={css.help}>
                        <FormattedMessage id="ui-rs.settings.scheduledActions.field.hoursHelp" />
                      </div>
                      <Field
                        id="scheduled-action-minute"
                        name="minute"
                        marginBottom0
                        aria-describedby="scheduled-action-minute-help"
                        component={TextField}
                        label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.minute" />}
                      />
                      <div id="scheduled-action-minute-help" className={css.help}>
                        <FormattedMessage id="ui-rs.settings.scheduledActions.field.minuteHelp" />
                      </div>
                    </Col>
                  </Row>
                </Accordion>

                {ParamsComponent && (
                  <Accordion
                    id="scheduled-action-options"
                    label={<FormattedMessage id="ui-rs.settings.scheduledActions.options" />}
                  >
                    <ParamsComponent />
                  </Accordion>
                )}
              </AccordionSet>
            </form>
          </Pane>
        );
      }}
    </Form>
  );
};

export default ScheduledActionForm;
