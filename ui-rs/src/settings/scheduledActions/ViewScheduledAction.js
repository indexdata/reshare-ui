import React, { useContext, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import { Button, ConfirmationModal, KeyValue, Pane } from '@folio/stripes/components';
import { CalloutContext, useOkapiKy } from '@folio/stripes/core';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';

import { describeSchedule } from './schedule/scheduleExpression';

const ViewScheduledAction = ({ history, match, basePath }) => {
  const { id } = match.params;
  const intl = useIntl();
  const okapiKy = useOkapiKy();
  const queryClient = useQueryClient();
  const callout = useContext(CalloutContext);
  const close = () => history.push(basePath);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isSuccess } = useOkapiQuery(`broker/batch_actions/${id}`);

  const remover = useMutation({
    mutationFn: () => okapiKy.delete(`broker/batch_actions/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries('broker/batch_actions');
      close();
    },
    onError: () => callout?.sendCallout({
      type: 'error',
      message: <FormattedMessage id="ui-rs.settings.scheduledActions.delete.error" />,
    }),
  });

  // active drives both directions: enable a disabled task, disable an active one.
  const active = data?.active;
  const toggler = useMutation({
    mutationFn: () => okapiKy.post(`broker/batch_actions/${id}/${active ? 'disable' : 'enable'}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries('broker/batch_actions');
      await queryClient.invalidateQueries(`broker/batch_actions/${id}`);
    },
    onError: () => callout?.sendCallout({
      type: 'error',
      message: <FormattedMessage id={`ui-rs.settings.scheduledActions.${active ? 'disable' : 'enable'}.error`} />,
    }),
  });

  if (!isSuccess) return null;

  const actionLabel = intl.formatMessage({
    id: `ui-rs.settings.scheduledActions.action.${data.actionName}`,
    defaultMessage: data.actionName,
  });

  return (
    <Pane
      defaultWidth="fill"
      paneTitle={actionLabel}
      onClose={close}
      dismissible
      actionMenu={({ onToggle }) => (
        <>
          <Button
            buttonStyle="dropdownItem"
            onClick={() => { onToggle(); history.push(`${basePath}/${id}/edit`); }}
          >
            <FormattedMessage id="ui-rs.edit" />
          </Button>
          <Button
            buttonStyle="dropdownItem"
            onClick={() => { onToggle(); toggler.mutate(); }}
          >
            <FormattedMessage id={`ui-rs.settings.scheduledActions.${active ? 'disable' : 'enable'}`} />
          </Button>
          <Button
            buttonStyle="dropdownItem"
            onClick={() => { onToggle(); setConfirmDelete(true); }}
          >
            <FormattedMessage id="ui-rs.delete" />
          </Button>
        </>
      )}
    >
      <KeyValue
        label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.actionName" />}
        value={actionLabel}
      />
      <KeyValue
        label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.scheduleUtc" />}
        value={describeSchedule(data.schedule, intl)}
      />
      <KeyValue
        label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.batchQuery" />}
        value={data.batchQuery}
      />
      <KeyValue
        label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.active" />}
        value={<FormattedMessage id={`ui-rs.settings.scheduledActions.status.${active ? 'active' : 'inactive'}`} />}
      />
      <ConfirmationModal
        open={confirmDelete}
        heading={<FormattedMessage id="ui-rs.settings.scheduledActions.delete.heading" />}
        message={<FormattedMessage id="ui-rs.settings.scheduledActions.delete.message" values={{ name: actionLabel }} />}
        confirmLabel={<FormattedMessage id="ui-rs.delete" />}
        onConfirm={() => { setConfirmDelete(false); remover.mutate(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Pane>
  );
};

export default ViewScheduledAction;
