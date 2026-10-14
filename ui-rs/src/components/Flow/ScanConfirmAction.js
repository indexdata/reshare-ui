import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Form, Field } from 'react-final-form';
import { Button, Layout, TextField } from '@folio/stripes/components';
import { useIntlCallout, useIsActionPending } from '@projectreshare/stripes-reshare';
import { noteParam } from '../AddNoteField';
import OptionalParams from './OptionalParams';

// Omit unset params; a cleared Datepicker yields '' rather than undefined.
export const compactParams = params => Object.fromEntries(
  Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
);

const defaultActionParams = values => ({ note: values.note });

const ScanConfirmAction = ({
  performAction, request, action, prompt, error, success, withNote = false,
  buildActionParams = defaultActionParams, params = [],
}) => {
  const optionalParams = [...(withNote ? [noteParam] : []), ...params];
  const sendCallout = useIntlCallout();
  const actionPending = !!useIsActionPending(request.id);

  const onSubmit = async values => {
    if (values?.reqId?.trim()?.toUpperCase() !== request.requesterRequestId?.toUpperCase()) {
      sendCallout('ui-rs.actions.wrongId', 'error');
      return false;
    }
    try {
      await performAction(action, compactParams(buildActionParams(values)), { success, error });
      return undefined;
    } catch (err) {
      return undefined;
    }
  };

  return (
    <Form
      onSubmit={onSubmit}
      render={({ handleSubmit, submitting, invalid }) => (
        <form onSubmit={handleSubmit} autoComplete="off">
          {prompt && <FormattedMessage id={prompt} />}
          {!prompt &&
            <FormattedMessage id={`stripes-reshare.actions.${action}`}>
              {dispAction => <FormattedMessage id="ui-rs.actions.generic.prompt" values={{ action: dispAction }} />}
            </FormattedMessage>
          }
          <Layout className="display-flex flex-align-items-start">
            <Field name="reqId" component={TextField} autoFocus />
            <Layout className="margin-start-gutter">
              <Button buttonStyle="primary mega" type="submit" disabled={submitting || invalid || actionPending}>
                <FormattedMessage id="ui-rs.button.scan" />
              </Button>
            </Layout>
          </Layout>
          {optionalParams.length > 0 && <OptionalParams params={optionalParams} />}
        </form>
      )}
    />
  );
};
export default ScanConfirmAction;
