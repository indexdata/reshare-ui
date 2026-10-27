import React, { useEffect, useState } from 'react';
import { Form, Field, useForm, useFormState } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button, Icon, Layout, Loading, MessageBanner, Modal, ModalFooter, Select, TextArea } from '@folio/stripes/components';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import useCancellationReasons from '#/util/useCancellationReasons';
import actionMeta from './actionMeta';

const CancellationReasonField = ({ reasons, disabled }) => {
  const intl = useIntl();
  const form = useForm();
  const { values: { reason } } = useFormState({ subscription: { values: true } });

  useEffect(() => {
    if (reason && !reasons.some(({ code }) => code === reason)) {
      form.change('reason', undefined);
    }
  }, [form, reason, reasons]);

  if (reasons.length === 0) return null;

  return (
    <Layout className="padding-top-gutter">
      <Field
        name="reason"
        component={Select}
        label={<FormattedMessage id="ui-rs.actions.cancel-request.reason" />}
        dataOptions={[
          { value: '', label: intl.formatMessage({ id: 'ui-rs.actions.cancel-request.noReason' }) },
          ...reasons.map(({ code, defaultDesc }) => ({ value: code, label: defaultDesc })),
        ]}
        disabled={disabled}
      />
    </Layout>
  );
};

const CancelRequest = ({ request, performAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const actionPending = !!useIsActionPending(request.id);
  const { reasons, isLoading, isError } = useCancellationReasons({ enabled: isOpen });

  const onSubmit = async ({ reason, note }) => {
    if (actionPending || isLoading) return undefined;

    const marker = reason && reasons.some(({ code }) => code === reason) ? `#CancellationReason: ${reason}#` : '';
    const cancellationNote = marker && note ? `${marker} ${note}` : marker || note;
    try {
      await performAction('cancel-request', cancellationNote ? { note: cancellationNote } : {});
      setIsOpen(false);
    } catch (err) {
      // performAction displays the error; retain the form so the user can retry.
    }
    return undefined;
  };

  return (
    <>
      <Button buttonStyle="dropdownItem" onClick={() => setIsOpen(true)} disabled={actionPending}>
        <Icon icon={actionMeta['cancel-request'].icon}>
          <FormattedMessage id="stripes-reshare.actions.cancel-request" />
        </Icon>
      </Button>
      {isOpen &&
        <Form
          onSubmit={onSubmit}
          render={({ handleSubmit, submitting, form }) => (
            <Modal
              label={<FormattedMessage id="stripes-reshare.actions.cancel-request" />}
              open
              dismissible={!submitting}
              // Stripes retains the initial Escape handler, so read live form state.
              onClose={() => { if (!form.getState().submitting) setIsOpen(false); }}
            >
              <form onSubmit={handleSubmit}>
                <FormattedMessage
                  id="ui-rs.actions.cancel-request.confirm"
                  values={{ id: request.requesterRequestId || request.id }}
                />
                {isLoading && <Loading />}
                {isError &&
                  <MessageBanner type="warning">
                    <FormattedMessage id="ui-rs.actions.cancel-request.reasonsError" />
                  </MessageBanner>
                }
                <CancellationReasonField reasons={reasons} disabled={submitting} />
                <Layout className="padding-top-gutter">
                  <Field
                    name="note"
                    component={TextArea}
                    label={<FormattedMessage id="ui-rs.actions.addNote" />}
                    disabled={submitting}
                  />
                </Layout>
                <ModalFooter>
                  <Button buttonStyle="danger" type="submit" disabled={submitting || actionPending || isLoading}>
                    <FormattedMessage id="ui-rs.actions.cancel-request.confirmButton" />
                  </Button>
                  <Button disabled={submitting} onClick={() => setIsOpen(false)}>
                    <FormattedMessage id="stripes-components.cancel" />
                  </Button>
                </ModalFooter>
              </form>
            </Modal>
          )}
        />
      }
    </>
  );
};

export default CancelRequest;
