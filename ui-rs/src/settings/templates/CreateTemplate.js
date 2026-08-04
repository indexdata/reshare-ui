import React, { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import { CalloutContext } from '@folio/stripes/core';
import { useOkapiKy, useCloseDirect } from '@projectreshare/stripes-reshare';

import TemplateForm from './TemplateForm';
import { buildCreateTemplateBody } from './mapping';

const INITIAL_VALUES = {
  title: '',
  // Unset, not defaulted: purpose cannot be changed after creation and decides
  // whether the template is ever found, so it is the user's to state.
  purpose: '',
  contentType: 'html',
  subject: '',
  body: '',
  labels: [''],
  audience: '',
};

const CreateTemplate = () => {
  const okapiKy = useOkapiKy();
  const queryClient = useQueryClient();
  const callout = useContext(CalloutContext);
  const close = useCloseDirect();

  const creator = useMutation({
    mutationFn: (values) => okapiKy.post('broker/templates', { json: buildCreateTemplateBody(values) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries('broker/templates');
      close();
    },
    onError: () => callout?.sendCallout({
      type: 'error',
      message: <FormattedMessage id="ui-rs.settings.templates.create.error" />,
    }),
  });

  return (
    <TemplateForm
      title={<FormattedMessage id="ui-rs.settings.templates.new" />}
      submitLabelId="ui-rs.create"
      onClose={close}
      initialValues={INITIAL_VALUES}
      submitting={creator.isLoading}
      onSubmit={(values) => creator.mutate(values)}
    />
  );
};

export default CreateTemplate;
