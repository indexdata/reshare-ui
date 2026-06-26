import React, { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import { CalloutContext } from '@folio/stripes/core';
import { useOkapiKy, useOkapiQuery, useCloseDirect } from '@projectreshare/stripes-reshare';

import ScheduledActionForm from './ScheduledActionForm';
import { buildBatchActionBody, recordToFormValues } from './model';
import { isScheduleSupported } from './schedule/scheduleExpression';

const EditScheduledAction = ({ match }) => {
  const { id } = match.params;
  const okapiKy = useOkapiKy();
  const queryClient = useQueryClient();
  const callout = useContext(CalloutContext);
  const close = useCloseDirect();

  const { data, isSuccess } = useOkapiQuery(`broker/batch_actions/${id}`);

  const updater = useMutation({
    mutationFn: (values) => okapiKy.put(`broker/batch_actions/${id}`, { json: buildBatchActionBody(values) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries('broker/batch_actions');
      await queryClient.invalidateQueries(`broker/batch_actions/${id}`);
      close();
    },
    onError: () => callout?.sendCallout({
      type: 'error',
      message: <FormattedMessage id="ui-rs.settings.scheduledActions.update.error" />,
    }),
  });

  if (!isSuccess) return null;

  return (
    <ScheduledActionForm
      title={<FormattedMessage id="ui-rs.settings.scheduledActions.edit" />}
      submitLabelId="ui-rs.save"
      editing
      unsupportedSchedule={isScheduleSupported(data.schedule) ? undefined : data.schedule}
      onClose={close}
      initialValues={recordToFormValues(data)}
      submitting={updater.isLoading}
      onSubmit={(values) => updater.mutate(values)}
    />
  );
};

export default EditScheduledAction;
