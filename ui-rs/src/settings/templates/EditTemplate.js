import React, { useContext, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import { CalloutContext } from '@folio/stripes/core';
import { useOkapiKy, useOkapiQuery, useCloseDirect } from '@projectreshare/stripes-reshare';

import TemplateForm from './TemplateForm';
import { buildUpdateTemplateBody, recordToFormValues } from './mapping';

const EditTemplate = ({ match }) => {
  const { id } = match.params;
  const okapiKy = useOkapiKy();
  const queryClient = useQueryClient();
  const callout = useContext(CalloutContext);
  const close = useCloseDirect();

  const { data, isSuccess } = useOkapiQuery(`broker/templates/${id}`);

  // Fresh objects here re-initialize the form and discard whatever is being typed,
  // since react-final-form compares initialValues shallowly and labels is an array.
  const initialValues = useMemo(() => recordToFormValues(data), [data]);

  const updater = useMutation({
    mutationFn: (values) => okapiKy.put(`broker/templates/${id}`, { json: buildUpdateTemplateBody(values) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries('broker/templates');
      await queryClient.invalidateQueries(`broker/templates/${id}`);
      close();
    },
    onError: () => callout?.sendCallout({
      type: 'error',
      message: <FormattedMessage id="ui-rs.settings.templates.update.error" />,
    }),
  });

  if (!isSuccess) return null;

  return (
    <TemplateForm
      title={<FormattedMessage id="ui-rs.settings.templates.edit" />}
      submitLabelId="ui-rs.save"
      editing
      onClose={close}
      initialValues={initialValues}
      submitting={updater.isLoading}
      onSubmit={(values) => updater.mutate(values)}
    />
  );
};

export default EditTemplate;
