import React, { useState } from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
import { Button, Icon, Layout, Loading, MessageBanner, Modal, ModalFooter, TextArea } from '@folio/stripes/components';
import useConsortiumReasons from '#/util/useConsortiumReasons';

import actionMeta from './actionMeta';
import DirectoryReasonField from './DirectoryReasonField';

const ActionReasonButton = ({ action, reasonConfigField, reasonField, request, performAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { reasons, isLoading, isError } = useConsortiumReasons({ field: reasonConfigField, enabled: isOpen });
  const actionPending = !!useIsActionPending(request.id);
  const icon = actionMeta[action]?.icon;

  const onSubmit = async values => {
    if (actionPending || isLoading || isError || !reasons.some(({ code }) => code === values[reasonField])) return undefined;

    try {
      await performAction(action, values, {
        success: `ui-rs.actions.${action}.success`,
        error: `ui-rs.actions.${action}.error`,
      });
      setIsOpen(false);
      return undefined;
    } catch (err) {
      return undefined;
    }
  };

  return (
    <>
      <Button buttonStyle="dropdownItem" onClick={() => setIsOpen(true)} disabled={actionPending}>
        <Icon icon={icon}><FormattedMessage id={`ui-rs.actions.${action}`} /></Icon>
      </Button>
      {isOpen &&
        <Form
          onSubmit={onSubmit}
          render={({ handleSubmit, submitting, invalid, values, form }) => (
            <Modal
              label={<FormattedMessage id={`ui-rs.actions.${action}`} />}
              open
              dismissible={!submitting}
              // Stripes retains the initial Escape handler, so read live form state.
              onClose={() => { if (!form.getState().submitting) setIsOpen(false); }}
            >
              <form onSubmit={handleSubmit}>
                <FormattedMessage id={`ui-rs.actions.${action}.confirm`} values={{ id: request.requesterRequestId || request.id, item: request.illRequest?.bibliographicInfo?.title }} />
                {isLoading && <Loading />}
                {isError &&
                  <MessageBanner type="warning">
                    <FormattedMessage id={`ui-rs.actions.${action}.reasonsError`} />
                  </MessageBanner>
                }
                {!isLoading && !isError && reasons.length === 0 &&
                  <MessageBanner type="warning">
                    <FormattedMessage id={`ui-rs.actions.${action}.noReasons`} />
                  </MessageBanner>
                }
                <DirectoryReasonField
                  name={reasonField}
                  labelId={`ui-rs.actions.${action}.reason`}
                  placeholderId={`ui-rs.actions.${action}.selectReason`}
                  reasons={reasons}
                  disabled={submitting || isLoading || isError}
                  required
                />
                <Layout className="padding-top-gutter">
                  <Field
                    name="note"
                    component={TextArea}
                    label={<FormattedMessage id="ui-rs.actions.addNote" />}
                    disabled={submitting}
                  />
                </Layout>
                <ModalFooter>
                  <Button
                    buttonStyle="danger"
                    type="submit"
                    disabled={submitting || invalid || actionPending || isLoading || isError || !reasons.some(({ code }) => code === values[reasonField])}
                  >
                    <FormattedMessage id={`ui-rs.actions.${action}`} />
                  </Button>
                  <Button disabled={submitting} onClick={() => setIsOpen(false)}>
                    <FormattedMessage id="ui-rs.button.goBack" />
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

export default ActionReasonButton;
