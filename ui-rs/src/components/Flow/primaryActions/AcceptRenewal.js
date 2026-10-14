import React from 'react';
import { Form } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import { Button, KeyValue } from '@folio/stripes/components';
import { noteParam } from '../../AddNoteField';
import OptionalParams from '../OptionalParams';
import DueDateField from '../../DueDateField';
import DueDate from '../../DueDate';
import { compactParams } from '../ScanConfirmAction';
import css from './AcceptRenewal.css';

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
          <div className={css.renewal}>
            <div className={css.current}>
              <KeyValue
                label={<FormattedMessage id="ui-rs.flow.info.dueDate.current" />}
                value={<DueDate value={request.dueDate} />}
              />
            </div>
            <div className={css.dueDate}>
              <DueDateField label={<FormattedMessage id="ui-rs.actions.accept-renewal.newDueDate" />} />
            </div>
            <div className={css.submit}>
              <Button buttonStyle="primary mega" type="submit" disabled={submitting || invalid || actionPending}>
                <FormattedMessage id="stripes-reshare.actions.accept-renewal" />
              </Button>
            </div>
            {!values.dueDate &&
              <div className={css.help}>
                <FormattedMessage id="ui-rs.actions.accept-renewal.openEnded" />
              </div>
            }
          </div>
          {withNote && <OptionalParams params={[noteParam]} />}
        </form>
      )}
    />
  );
};

export default AcceptRenewal;
