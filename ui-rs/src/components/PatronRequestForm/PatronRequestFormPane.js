import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useForm, useFormState } from 'react-final-form';
import { Prompt } from 'react-router-dom';
import { Button, Pane, Paneset, PaneFooter } from '@folio/stripes/components';

const PatronRequestFormPane = ({
  titleId,
  submitLabelId = titleId,
  submitDisabled = false,
  onClose,
  children,
}) => {
  const form = useForm();
  const { pristine, submitting, submitSucceeded } = useFormState({
    subscription: { pristine: true, submitting: true, submitSucceeded: true },
  });

  // The submit button is in the footer, outside the form element, so both route
  // through here. Also applies submitDisabled to an Enter-key submit.
  const submit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (submitting || submitDisabled) return undefined;
    return form.submit();
  };

  return (
    <Paneset>
      <Pane
        defaultWidth="100%"
        centerContent
        onClose={onClose}
        dismissible={!submitting}
        paneTitle={<FormattedMessage id={titleId} />}
        footer={
          <PaneFooter
            renderStart={
              <Button
                id="clickable-cancel-request-form"
                buttonStyle="default mega"
                marginBottom0
                onClick={onClose}
                disabled={submitting}
              >
                <FormattedMessage id="stripes-core.button.cancel" />
              </Button>
            }
            renderEnd={
              <Button
                type="submit"
                disabled={submitting || submitDisabled}
                onClick={submit}
                buttonStyle="primary mega"
                marginBottom0
              >
                <FormattedMessage id={submitLabelId} />
              </Button>
            }
          />
        }
      >
        <form onSubmit={submit}>
          {children}
        </form>
        <FormattedMessage id="ui-rs.confirmDirtyNavigate">
          {prompt => <Prompt when={!pristine && !(submitting || submitSucceeded)} message={prompt[0]} />}
        </FormattedMessage>
      </Pane>
    </Paneset>
  );
};

export default PatronRequestFormPane;
