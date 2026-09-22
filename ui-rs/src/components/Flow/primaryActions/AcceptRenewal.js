import React from 'react';
import { Form } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import { Button, Col, KeyValue, Row } from '@folio/stripes/components';
import { noteParam } from '../../AddNoteField';
import OptionalParams from '../OptionalParams';
import DueDateField from '../../DueDateField';
import DueDate from '../../DueDate';
import { compactParams } from '../ScanConfirmAction';

const AcceptRenewal = ({ performAction, request, withNote = false }) => {
  const actionPending = !!useIsActionPending(request.id);

  const onSubmit = async values => {
    try {
      await performAction('accept-renewal', compactParams({ dueDate: values.dueDate, note: values.note }), {
        success: 'stripes-reshare.actions.accept-renewal.success',
        error: 'stripes-reshare.actions.accept-renewal.error',
      });
      return undefined;
    } catch (err) {
      return undefined;
    }
  };

  return (
    <Form
      onSubmit={onSubmit}
      render={({ handleSubmit, submitting, invalid, values }) => (
        <form onSubmit={handleSubmit} autoComplete="off">
          <Row>
            <Col xs={3}>
              <KeyValue
                label={<FormattedMessage id="ui-rs.flow.info.dueDate.current" />}
                value={<DueDate value={request.dueDate} />}
              />
            </Col>
            <Col xs={8}>
              <DueDateField
                label={<FormattedMessage id="ui-rs.actions.accept-renewal.newDueDate" />}
                help={values.dueDate ? undefined : <FormattedMessage id="ui-rs.actions.accept-renewal.openEnded" />}
              />
            </Col>
            <Col xs={1}>
              <Button buttonStyle="primary mega" type="submit" disabled={submitting || invalid || actionPending}>
                <FormattedMessage id="stripes-reshare.actions.accept-renewal" />
              </Button>
            </Col>
          </Row>
          {withNote && <OptionalParams params={[noteParam]} />}
        </form>
      )}
    />
  );
};

export default AcceptRenewal;
