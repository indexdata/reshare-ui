import { useContext, useState } from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { useQueryClient } from 'react-query';
import { Button, Icon, Modal, ModalFooter, TextArea } from '@folio/stripes/components';
import { CalloutContext } from '@folio/stripes/core';
import { useOkapiKy } from '@projectreshare/stripes-reshare';

const EditInternalNote = ({ request }) => {
  const [isOpen, setIsOpen] = useState(false);
  const okapiKy = useOkapiKy();
  const queryClient = useQueryClient();
  const callout = useContext(CalloutContext);

  const close = () => setIsOpen(false);

  const onSubmit = async ({ internalNote }) => {
    try {
      await okapiKy.put(`broker/patron_requests/${request.id}/internal_note`, { json: { internalNote: internalNote ?? '' } });
      await queryClient.invalidateQueries(`broker/patron_requests/${request.id}`);
      callout.sendCallout({ message: <FormattedMessage id="ui-rs.information.internalNote.save.success" /> });
      close();
    } catch {
      callout.sendCallout({ type: 'error', message: <FormattedMessage id="ui-rs.information.internalNote.save.error" /> });
    }
  };

  return (
    <>
      <Button buttonStyle="dropdownItem" onClick={() => setIsOpen(true)}>
        <Icon icon="edit">
          <FormattedMessage id="ui-rs.information.internalNote" />
        </Icon>
      </Button>
      <Modal
        label={<FormattedMessage id="ui-rs.information.internalNote" />}
        open={isOpen}
        onClose={close}
        dismissible
      >
        <Form
          onSubmit={onSubmit}
          initialValues={{ internalNote: request.internalNote ?? '' }}
          render={({ handleSubmit, submitting }) => (
            <form onSubmit={handleSubmit}>
              <Field
                id="edit-internal-note"
                name="internalNote"
                component={TextArea}
                rows={8}
                autoFocus
              />
              <ModalFooter>
                <Button buttonStyle="primary" onClick={handleSubmit} disabled={submitting}>
                  <FormattedMessage id="ui-rs.save" />
                </Button>
                <Button onClick={close}>
                  <FormattedMessage id="ui-rs.button.goBack" />
                </Button>
              </ModalFooter>
            </form>
          )}
        />
      </Modal>
    </>
  );
};

export default EditInternalNote;
