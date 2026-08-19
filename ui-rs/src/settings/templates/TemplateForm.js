import React, { useRef, useState } from 'react';
import { Form, Field, useForm } from 'react-final-form';
import { FieldArray } from 'react-final-form-arrays';
import arrayMutators from 'final-form-arrays';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Button,
  Checkbox,
  Col,
  ConfirmationModal,
  Editor,
  Label,
  Pane,
  PaneFooter,
  RepeatableField,
  Row,
  Select,
  TextArea,
  TextField,
} from '@folio/stripes/components';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';

import { recordToFormValues, escapeHtml, suggestedLabels } from './mapping';
import css from './TemplateForm.css';

// "Template" here is a stored message template. The scheduled-actions form uses the
// same word for its batch-action presets; unrelated, hence the separate key namespace.

// Lowercase letters, hyphen-separated, as every label the broker ships is written.
// Hyphens have to join two words, so a bare or trailing one is rejected.
const LABEL_FORMAT = /^[a-z]+(-[a-z]+)*$/;

const PURPOSES = ['email', 'pullslip'];
const CONTENT_TYPES = ['text', 'html'];
const AUDIENCES = ['', 'patron', 'staff'];

// Built-in templates that seed the form but are not themselves submitted; the broker
// serves them and creates none. Unlike the scheduled-actions preset picker there is no
// titleKey to localize against: these carry a plain title, so it is shown as-is.
const PresetPicker = ({ presets, bodyIsMarkup }) => {
  const intl = useIntl();
  const form = useForm();
  const [selected, setSelected] = useState('');
  if (!presets.length) return null;

  const options = [
    { value: '', label: intl.formatMessage({ id: 'ui-rs.settings.templates.preset.placeholder' }) },
    ...presets.map((preset, i) => ({ value: String(i), label: preset.title })),
  ];

  const onChange = (e) => {
    const idx = e.target.value;
    setSelected(idx);
    if (idx === '') return;
    const values = recordToFormValues(presets[Number(idx)]);
    // Seeding replaces body and contentType together, so the tracked encoding has
    // to follow or a later toggle would escape seeded markup.
    bodyIsMarkup.current = values.contentType === 'html';
    form.batch(() => {
      Object.entries(values).forEach(([field, value]) => form.change(field, value));
    });
  };

  return (
    <Row>
      <Col xs={12} md={8}>
        <Select
          id="template-preset"
          dataOptions={options}
          value={selected}
          onChange={onChange}
          label={<FormattedMessage id="ui-rs.settings.templates.preset.field" />}
        />
      </Col>
    </Row>
  );
};

// Appends a label the broker actually resolves against. Free-typed labels stay
// allowed: nothing stops a state model from referencing a label we don't know yet.
const LabelSuggestions = ({ suggestions }) => {
  const intl = useIntl();
  const form = useForm();
  if (!suggestions.length) return null;

  const options = [
    { value: '', label: intl.formatMessage({ id: 'ui-rs.settings.templates.field.knownLabelPlaceholder' }) },
    ...suggestions.map(label => ({ value: label, label })),
  ];

  const onChange = (e) => {
    const label = e.target.value;
    if (!label) return;
    const current = form.getState().values.labels ?? [];
    if (current.some(entry => (entry ?? '').trim() === label)) return;
    const blank = current.findIndex(entry => !(entry ?? '').trim());
    if (blank >= 0) form.change(`labels[${blank}]`, label);
    else form.mutators.push('labels', label);
  };

  return (
    <Select
      id="template-known-label"
      dataOptions={options}
      value=""
      onChange={onChange}
      label={<FormattedMessage id="ui-rs.settings.templates.field.knownLabel" />}
    />
  );
};

// The body, as either the WYSIWYG or its markup. Quill has no source view of its
// own, so the toggle is separate from contentType, which decides what is stored.
// Going back to Quill re-parses the markup and drops anything it has no format
// for (tables, style attributes, most pasted email HTML), hence the confirmation
// on that leg only.
//
// Quill re-parses on mount too, reported as an onChange with source `api`. Those
// are dropped rather than written to the form, so an unedited body saves back
// byte-identical -- and dropping one is how we know to warn.
const SourceToggle = ({ checked, onChange }) => (
  <Checkbox
    id="template-body-source"
    checked={checked}
    onChange={onChange}
    label={<FormattedMessage id="ui-rs.settings.templates.field.editSource" />}
  />
);

const BodyField = ({ isHtml, storedBody }) => {
  const form = useForm();
  const [sourceMode, setSourceMode] = useState(false);
  const [confirmWysiwyg, setConfirmWysiwyg] = useState(false);
  const [quillWouldRewrite, setQuillWouldRewrite] = useState(false);
  const label = <FormattedMessage id="ui-rs.settings.templates.field.body" />;

  if (!isHtml || sourceMode) {
    return (
      <>
        {isHtml && (
          <SourceToggle checked onChange={() => setConfirmWysiwyg(true)} />
        )}
        <Field
          id="template-body"
          name="body"
          required
          component={TextArea}
          rows={10}
          label={label}
        />
        <ConfirmationModal
          open={confirmWysiwyg}
          heading={<FormattedMessage id="ui-rs.settings.templates.wysiwyg.heading" />}
          message={<FormattedMessage id="ui-rs.settings.templates.wysiwyg.message" />}
          confirmLabel={<FormattedMessage id="ui-rs.settings.templates.wysiwyg.confirm" />}
          onConfirm={() => { setConfirmWysiwyg(false); setSourceMode(false); }}
          onCancel={() => setConfirmWysiwyg(false)}
        />
      </>
    );
  }

  return (
    <>
      <SourceToggle checked={false} onChange={() => setSourceMode(true)} />
      <Field name="body">
        {({ input, meta }) => (
          <Editor
            id="template-body"
            input={input}
            meta={meta}
            required
            label={label}
            // Spread after `input` by formField, so this wins over input.onChange
            // and decides for itself what reaches the form.
            onChange={(value, delta, source) => {
              if (source === 'user') {
                input.onChange(value);
                return;
              }
              // Not a user edit: Quill re-parsing what we gave it. Dropping the value
              // is the point -- an unedited body has to save back exactly as stored.
              // Only the stored body earns a warning. Quill normalizes everything
              // it is given -- bare text gains a <p>, for one -- so flagging every
              // difference would fire on our own text-to-HTML conversion too.
              const current = form.getState().values.body;
              if (current && current === storedBody && value !== current) setQuillWouldRewrite(true);
            }}
          />
        )}
      </Field>
      {quillWouldRewrite && (
        <div id="template-body-rewrite" className={css.help} role="status">
          <FormattedMessage id="ui-rs.settings.templates.field.bodyRewritten" />
          {' '}
          <Button buttonStyle="link" marginBottom0 onClick={() => setSourceMode(true)}>
            <FormattedMessage id="ui-rs.settings.templates.field.editSource" />
          </Button>
        </div>
      )}
    </>
  );
};

const TemplateForm = ({ initialValues, onSubmit, onClose, title, submitLabelId, submitting, editing }) => {
  const intl = useIntl();
  // Presets seed the form; stored templates contribute any locally used labels.
  // Both are optional, so either request can fail without disabling free-text labels.
  const { data: presets } = useOkapiQuery('broker/state_model/templates', { useErrorBoundary: false });
  const { data: templates } = useOkapiQuery('broker/templates', {
    searchParams: { limit: 100 },
    useErrorBoundary: false,
  });
  const labelSources = [...(presets ?? []), ...(templates?.items ?? [])];

  const msg = (id) => intl.formatMessage({ id: `ui-rs.settings.templates.validate.${id}` });
  const opts = (field, values) => values.map(value => ({
    value,
    label: intl.formatMessage({ id: `ui-rs.settings.templates.${field}.${value || 'both'}` }),
  }));

  // Offered only while creating: an existing template's purpose can never be unset.
  const purposeOptions = editing
    ? opts('purpose', PURPOSES)
    : [{ value: '', label: intl.formatMessage({ id: 'ui-rs.settings.templates.purpose.placeholder' }) }, ...opts('purpose', PURPOSES)];

  const validate = (values) => {
    const errors = {};
    if (!values.purpose) errors.purpose = msg('purpose');
    if (!values.title?.trim()) errors.title = msg('title');
    if (!values.body?.trim()) errors.body = msg('body');
    // An empty subject fails the broker's send outright.
    if (values.purpose === 'email' && !values.subject?.trim()) errors.subject = msg('subject');
    return errors;
  };

  // Whether the body currently holds markup, which is not the same question as
  // which content type is selected: switching to text leaves the markup alone.
  const bodyIsMarkup = useRef(initialValues?.contentType === 'html');

  const validateLabelCount = (value) => (
    (value ?? []).some(label => (label ?? '').trim()) ? undefined : msg('labels')
  );

  // Labels are matched literally against what a state model or scheduled action asks
  // for, so the form keeps them to the shape those references use. Blank rows are
  // left to validateLabelCount, which owns "at least one".
  const validateLabelFormat = (value) => {
    const label = (value ?? '').trim();
    if (!label) return undefined;
    return LABEL_FORMAT.test(label) ? undefined : msg('labelFormat');
  };

  return (
    <Form
      onSubmit={onSubmit}
      initialValues={initialValues}
      mutators={{ ...arrayMutators }}
      validate={validate}
    >
      {({ handleSubmit, values, pristine, invalid, form }) => {
        const isHtml = values.contentType === 'html';
        const isPullslip = values.purpose === 'pullslip';
        const footer = (
          <PaneFooter
            renderStart={
              <Button
                id="clickable-cancel-template"
                buttonStyle="default mega"
                marginBottom0
                onClick={onClose}
              >
                <FormattedMessage id="stripes-core.button.cancel" />
              </Button>
            }
            renderEnd={
              <Button
                id="clickable-save-template"
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
            <form id="template-form" onSubmit={handleSubmit}>
              {!editing && <PresetPicker presets={presets ?? []} bodyIsMarkup={bodyIsMarkup} />}
              <Row>
                <Col xs={12} md={6}>
                  <Field
                    id="template-title"
                    name="title"
                    required
                    component={TextField}
                    label={<FormattedMessage id="ui-rs.settings.templates.field.title" />}
                  />
                </Col>
                <Col xs={12} md={3}>
                  <Field name="purpose">
                    {({ input }) => (
                      <Select
                        id="template-purpose"
                        dataOptions={purposeOptions}
                        required
                        // A template's purpose is fixed once created: UpdateTemplate has no such field.
                        disabled={editing}
                        label={<FormattedMessage id="ui-rs.settings.templates.field.purpose" />}
                        value={input.value}
                        onBlur={input.onBlur}
                        onFocus={input.onFocus}
                        onChange={input.onChange}
                      />
                    )}
                  </Field>
                </Col>
                <Col xs={12} md={3}>
                  <Field
                    id="template-audience"
                    name="audience"
                    component={Select}
                    dataOptions={opts('audience', AUDIENCES)}
                    label={<FormattedMessage id="ui-rs.settings.templates.field.audience" />}
                  />
                </Col>
              </Row>

              <Row>
                <Col xs={12} md={6}>
                  <Field
                    id="template-subject"
                    name="subject"
                    required={!isPullslip}
                    // Disabled rather than hidden: a subject typed before the purpose
                    // changed shouldn't vanish from view.
                    disabled={isPullslip}
                    marginBottom0={isPullslip}
                    aria-describedby={isPullslip ? 'template-subject-help' : undefined}
                    component={TextField}
                    label={<FormattedMessage id="ui-rs.settings.templates.field.subject" />}
                  />
                  {isPullslip && (
                    <div id="template-subject-help" className={css.help}>
                      <FormattedMessage id="ui-rs.settings.templates.field.subjectHelp" />
                    </div>
                  )}
                </Col>
                <Col xs={12} md={6}>
                  <Field name="contentType">
                    {({ input }) => (
                      <>
                        <Select
                          id="template-contentType"
                          dataOptions={opts('contentType', CONTENT_TYPES)}
                          marginBottom0
                          aria-describedby="template-contentType-help"
                          label={<FormattedMessage id="ui-rs.settings.templates.field.contentType" />}
                          value={input.value}
                          onBlur={input.onBlur}
                          onFocus={input.onFocus}
                          onChange={(e) => {
                            input.onChange(e);
                            // Escape only text. The reverse leg leaves markup alone, so a
                            // body that has been through HTML stays markup and escaping it
                            // again would show the user their own tags.
                            const toHtml = e.target.value === 'html';
                            if (toHtml && !bodyIsMarkup.current) {
                              const body = form.getState().values.body ?? '';
                              if (body) form.change('body', escapeHtml(body));
                            }
                            bodyIsMarkup.current = bodyIsMarkup.current || toHtml;
                          }}
                        />
                        <div id="template-contentType-help" className={css.help}>
                          <FormattedMessage id="ui-rs.settings.templates.field.contentTypeHelp" />
                        </div>
                      </>
                    )}
                  </Field>
                </Col>
              </Row>

              <Row>
                <Col xs={12}>
                  <BodyField isHtml={isHtml} storedBody={initialValues?.body} />
                </Col>
              </Row>

              <Row>
                <Col xs={12} md={6}>
                  <FieldArray
                    name="labels"
                    component={RepeatableField}
                    headLabels={(
                      <Label required>
                        <FormattedMessage id="ui-rs.settings.templates.field.labels" />
                      </Label>
                    )}
                    addLabel={<FormattedMessage id="ui-rs.settings.templates.field.addLabel" />}
                    onAdd={fields => fields.push('')}
                    hasMargin={false}
                    validate={validateLabelCount}
                    renderField={field => (
                      <Field
                        id={`template-label-${field}`}
                        name={field}
                        component={TextField}
                        validate={validateLabelFormat}
                      />
                    )}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <LabelSuggestions suggestions={suggestedLabels(labelSources)} />
                </Col>
              </Row>
            </form>
          </Pane>
        );
      }}
    </Form>
  );
};

export default TemplateForm;
