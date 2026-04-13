import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Form, Field } from 'react-final-form';
import { Button, Row, Col, TextField } from '@folio/stripes/components';
import { useIntlCallout, useIsActionPending } from '@projectreshare/stripes-reshare';
import AddNoteField from '../AddNoteField';

const ScanConfirmAction = ({ performAction, request, action, prompt, error, success, withNote = false }) => {
  const sendCallout = useIntlCallout();
  const actionPending = !!useIsActionPending(request.id);

  const onSubmit = async values => {
    if (values?.reqId?.trim()?.toUpperCase() !== request.requesterRequestId?.toUpperCase()) {
      sendCallout('ui-rs.actions.wrongId', 'error');
      return false;
    }
    return performAction(action, { note: values.note }, { success, error });
  };

  return (
    <Form
      onSubmit={onSubmit}
      render={({ handleSubmit, submitting }) => (
        <form onSubmit={handleSubmit} autoComplete="off">
          {prompt && <FormattedMessage id={prompt} />}
          {!prompt &&
            <FormattedMessage id={`stripes-reshare.actions.${action}`}>
              {dispAction => <FormattedMessage id="ui-rs.actions.generic.prompt" values={{ action: dispAction }} />}
            </FormattedMessage>
          }
          <Row>
            <Col xs={11}>
              <Field name="reqId" component={TextField} autoFocus />
            </Col>
            <Col xs={1}>
              <Button buttonStyle="primary mega" type="submit" disabled={submitting || actionPending}>
                <FormattedMessage id="ui-rs.button.scan" />
              </Button>
            </Col>
          </Row>
          { withNote && <AddNoteField /> }
        </form>
      )}
    />
  );
};
ScanConfirmAction.propTypes = {
  performAction: PropTypes.func.isRequired,
  request: PropTypes.object.isRequired,
  action: PropTypes.string.isRequired,
  prompt: PropTypes.string,
  error: PropTypes.string,
  success: PropTypes.string,
};
export default ScanConfirmAction;
