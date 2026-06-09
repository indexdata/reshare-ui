import React, { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import { CalloutContext, useOkapiKy } from '@folio/stripes/core';

import ScheduledActionForm from './ScheduledActionForm';
import { buildBatchActionBody } from './model';

const INITIAL_VALUES = {
  actionName: 'email-pullslips',
  days: [],
  hours: '',
  minute: 0,
  batchQuery: '',
  actionParams: { attachPdf: false },
};

const CreateScheduledAction = ({ history, basePath }) => {
  const okapiKy = useOkapiKy();
  const queryClient = useQueryClient();
  const callout = useContext(CalloutContext);
  const close = () => history.push(basePath);

  const creator = useMutation({
    mutationFn: (values) => okapiKy.post('broker/batch_actions', { json: buildBatchActionBody(values) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries('broker/batch_actions');
      close();
    },
    onError: () => callout?.sendCallout({
      type: 'error',
      message: <FormattedMessage id="ui-rs.settings.scheduledActions.create.error" />,
    }),
  });

  return (
    <ScheduledActionForm
      title={<FormattedMessage id="ui-rs.settings.scheduledActions.new" />}
      submitLabelId="ui-rs.create"
      onClose={close}
      initialValues={INITIAL_VALUES}
      submitting={creator.isLoading}
      onSubmit={(values) => creator.mutate(values)}
    />
  );
};

export default CreateScheduledAction;
