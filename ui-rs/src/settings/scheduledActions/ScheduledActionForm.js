import React, { useState } from 'react';
import { Form, Field, useForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
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
import { useOkapiQuery } from '@projectreshare/stripes-reshare';

import DaysOfWeek from './schedule/DaysOfWeek/DaysOfWeek';
import { isHourListValid, isMinuteValid, isIntervalValid } from './schedule/scheduleExpression';
import { recordToFormValues } from './model';
import actionRegistry from './actions/actionRegistry';
import css from './ScheduledActionForm.css';

// Templates seed the form but are not themselves submitted.
const TemplatePicker = ({ templates }) => {
  const intl = useIntl();
  const form = useForm();
  const [selected, setSelected] = useState('');
  if (!templates.length) return null;

  const templateLabel = (t) => intl.formatMessage({
    id: `ui-rs.settings.scheduledActions.templates.${t.titleKey}`,
    defaultMessage: t.title,
  });

  const options = [
    { value: '', label: intl.formatMessage({ id: 'ui-rs.settings.scheduledActions.template.placeholder' }) },
    ...templates.map((t, i) => ({ value: String(i), label: templateLabel(t) })),
  ];

  const onChange = (e) => {
    const idx = e.target.value;
    setSelected(idx);
    if (idx === '') return;
    // Replacing actionParams prevents parameters leaking between action types.
    const values = recordToFormValues(templates[Number(idx)]);
    form.batch(() => {
      Object.entries(values).forEach(([field, value]) => form.change(field, value));
    });
  };

  return (
    <Row>
      <Col xs={12} md={8}>
        <Select
          id="scheduled-action-template"
          dataOptions={options}
          value={selected}
          onChange={onChange}
          label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.template" />}
        />
      </Col>
    </Row>
  );
};

const ScheduledActionForm = ({ initialValues, onSubmit, onClose, title, submitLabelId, submitting, editing, unsupportedSchedule }) => {
  const intl = useIntl();
  // Template lookup is optional; failure leaves the manual form usable.
  const { data: templates } = useOkapiQuery(
    'broker/state_model/batch_actions',
    { enabled: !editing, useErrorBoundary: false }
  );
  const actionOptions = Object.keys(actionRegistry).map(name => ({
    value: name,
    label: intl.formatMessage({ id: `ui-rs.settings.scheduledActions.action.${name}` }),
  }));
  const frequencyOptions = ['weekly', 'hourly', 'minutely'].map(freq => ({
    value: freq,
    label: intl.formatMessage({ id: `ui-rs.settings.scheduledActions.frequency.${freq}` }),
  }));

  const msg = (id) => intl.formatMessage({ id: `ui-rs.settings.scheduledActions.validate.${id}` });
  const validate = (values) => {
    const errors = {};
    if (!values.batchQuery || !values.batchQuery.trim()) errors.batchQuery = msg('batchQuery');
    const frequency = values.frequency ?? 'weekly';
    if (frequency === 'minutely') {
      if (!isIntervalValid(values.interval)) errors.interval = msg('intervalMinutes');
    } else if (frequency === 'hourly') {
      if (!isMinuteValid(values.minute)) errors.minute = msg('minute');
    } else {
      // Without BYDAY, a weekly RRULE inherits DTSTART's weekday.
      if (!values.days || values.days.length === 0) errors.days = msg('days');
      const hours = (values.hours ?? '').toString().trim();
      if (!hours) errors.hours = msg('hoursRequired');
      else if (!isHourListValid(hours)) errors.hours = msg('hoursInvalid');
      if (!isMinuteValid(values.minute)) errors.minute = msg('minute');
    }
    return errors;
  };

  return (
    <Form
      onSubmit={onSubmit}
      initialValues={initialValues}
      mutators={{ ...arrayMutators }}
      validate={validate}
    >
      {({ handleSubmit, values, pristine, invalid, form }) => {
        const ParamsComponent = actionRegistry[values?.actionName]?.form;
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
              {!editing && <TemplatePicker templates={templates ?? []} />}
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
                          // Parameters belong to one action type.
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
                    <Col xs={12} md={4}>
                      <Field name="frequency">
                        {({ input }) => (
                          <Select
                            id="scheduled-action-frequency"
                            dataOptions={frequencyOptions}
                            label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.frequency" />}
                            value={input.value}
                            onBlur={input.onBlur}
                            onFocus={input.onFocus}
                            onChange={input.onChange}
                          />
                        )}
                      </Field>
                    </Col>
                  </Row>

                  {values.frequency === 'minutely' && (
                    <Row>
                      <Col xs={12} md={4}>
                        <Field
                          id="scheduled-action-interval"
                          name="interval"
                          component={TextField}
                          label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.interval" />}
                        />
                      </Col>
                    </Row>
                  )}

                  {values.frequency === 'hourly' && (
                    <Row>
                      <Col xs={12} md={4}>
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
                  )}

                  {(values.frequency ?? 'weekly') === 'weekly' && (
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
                  )}
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
