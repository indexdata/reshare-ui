import { useContext, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useQueryClient } from 'react-query';
import { Button, ConfirmationModal, Icon } from '@folio/stripes/components';
import { CalloutContext, IfPermission } from '@folio/stripes/core';
import { useOkapiKy } from '@projectreshare/stripes-reshare';

import AppNameContext from '../AppNameContext';

const ManualClose = ({ request }) => {
  const [isOpen, setIsOpen] = useState(false);
  const okapiKy = useOkapiKy();
  const queryClient = useQueryClient();
  const callout = useContext(CalloutContext);
  const appName = useContext(AppNameContext);
  const editPerm = `ui-${appName}.edit`;

  // Backend rejects terminating an already terminal request, so don't offer it.
  if (request?.terminalState) return null;

  const close = () => setIsOpen(false);

  const onConfirm = async () => {
    try {
      await okapiKy.post(`broker/patron_requests/${request.id}/terminate`);
      queryClient.invalidateQueries(`broker/patron_requests/${request.id}`);
      queryClient.invalidateQueries(`broker/patron_requests/${request.id}/actions`);
      queryClient.invalidateQueries('broker/patron_requests');
      callout.sendCallout({ message: <FormattedMessage id="ui-rs.manualClose.success" /> });
      close();
    } catch (err) {
      const errMsg = err?.message ?? '';
      callout.sendCallout({ type: 'error', message: <FormattedMessage id="ui-rs.manualClose.error" values={{ errMsg }} /> });
    }
  };

  return (
    <IfPermission perm={editPerm}>
      <Button buttonStyle="dropdownItem" onClick={() => setIsOpen(true)}>
        <Icon icon="times-circle-solid">
          <FormattedMessage id="ui-rs.manualClose" />
        </Icon>
      </Button>
      <ConfirmationModal
        open={isOpen}
        heading={<FormattedMessage id="ui-rs.manualClose" />}
        message={<FormattedMessage id="ui-rs.manualClose.confirm" values={{ hrid: request.requesterRequestId || request.id }} />}
        confirmLabel={<FormattedMessage id="ui-rs.manualClose.confirm.confirmLabel" />}
        onConfirm={onConfirm}
        onCancel={close}
      />
    </IfPermission>
  );
};

export default ManualClose;
