import React, { useContext, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import { Button, Col, ConfirmationModal, KeyValue, Pane, Row } from '@folio/stripes/components';
import { CalloutContext } from '@folio/stripes/core';
import { DirectLink, useOkapiKy, useOkapiQuery, useCloseDirect } from '@projectreshare/stripes-reshare';

import { describeSchedule } from './schedule/scheduleExpression';
import actionRegistry from './actions/actionRegistry';

const ViewScheduledAction = ({ match }) => {
  const { id } = match.params;
  const intl = useIntl();
  const okapiKy = useOkapiKy();
  const queryClient = useQueryClient();
  const callout = useContext(CalloutContext);
  const close = useCloseDirect();
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
  const ParamsView = actionRegistry[data.actionName]?.view;

  return (
    <Pane
      defaultWidth="fill"
      paneTitle={actionLabel}
      onClose={close}
      dismissible
      actionMenu={({ onToggle }) => (
        <>
          <DirectLink
            component={Button}
            buttonStyle="dropdownItem"
            onClick={onToggle}
            to={`${match.url}/edit`}
          >
            <FormattedMessage id="ui-rs.edit" />
          </DirectLink>
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
      <Row>
        <Col xs={12} md={6}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.batchQuery" />}
            value={data.batchQuery}
          />
          <KeyValue
            label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.active" />}
            value={<FormattedMessage id={`ui-rs.settings.scheduledActions.status.${active ? 'active' : 'inactive'}`} />}
          />
          <KeyValue
            label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.scheduleUtc" />}
            value={describeSchedule(data.schedule, intl)}
          />
        </Col>
        <Col xs={12} md={6}>
          {ParamsView && <ParamsView actionParams={data.actionParams} />}
        </Col>
      </Row>
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
