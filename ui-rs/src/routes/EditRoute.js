import React, { useContext } from 'react';
import { Form } from 'react-final-form';
import { useMutation, useQueryClient } from 'react-query';
import { Redirect, useHistory, useLocation } from 'react-router-dom';
import { CalloutContext } from '@folio/stripes/core';
import { useCloseDirect, useOkapiKy, useOkapiQuery, upNLevels } from '@projectreshare/stripes-reshare';
import PatronRequestForm from '../components/PatronRequestForm';
import PatronRequestFormPane from '../components/PatronRequestForm/PatronRequestFormPane';
import submissionError from '../components/PatronRequestForm/submissionError';
import useOptions from '../components/PatronRequestForm/useOptions';
import { brokerToForm, formToBroker } from '../components/PatronRequestForm/formMapping';
import { EDIT } from '../components/PatronRequestForm/operations';
import isRequestEditable from '../util/isRequestEditable';
import handleSISelect from '../components/PatronRequestForm/handleSISelect';

const EditRoute = ({ match }) => {
  const id = match.params?.id;
  const history = useHistory();
  const routerLocation = useLocation();
  const callout = useContext(CalloutContext);
  const queryClient = useQueryClient();
  const okapiKy = useOkapiKy();
  const requestView = upNLevels(routerLocation, 1);
  const close = useCloseDirect(requestView);

  const { data: request, isSuccess: hasRequestLoaded } = useOkapiQuery(
    `broker/patron_requests/${id}`,
    { staleTime: 30 * 1000, notifyOnChangeProps: 'tracked' }
  );

  const { data: stateModel, isSuccess: hasModelLoaded } = useOkapiQuery(
    `broker/state_model/models/${request?.stateModel}`,
    { staleTime: 30 * 60 * 1000, cacheTime: 8 * 60 * 60 * 1000, enabled: hasRequestLoaded }
  );

  const { options, isSuccess: optionsLoaded } = useOptions();

  const editor = useMutation({
    mutationFn: (updatedRecord) => okapiKy
      .put(`broker/patron_requests/${id}`, { json: updatedRecord }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(`broker/patron_requests/${id}`);
      await queryClient.invalidateQueries('broker/patron_requests');
      history.replace(requestView);
    },
  });

  if (!hasRequestLoaded || !hasModelLoaded || !optionsLoaded) return null;

  if (!isRequestEditable(stateModel, request)) {
    return <Redirect to={requestView} />;
  }

  const initialValues = brokerToForm(request, { tiers: options.tiers });

  const submit = async submittedRecord => {
    const updatedRecord = formToBroker(submittedRecord, { operation: EDIT, tiers: options.tiers });
    try {
      await editor.mutateAsync(updatedRecord);
      return undefined;
    } catch (err) {
      return submissionError(callout, 'ui-rs.edit.error', err);
    }
  };

  return (
    <Form onSubmit={submit} initialValues={initialValues} mutators={{ handleSISelect }} keepDirtyOnReinitialize>
      {({ form, pristine }) => (
        <PatronRequestFormPane
          titleId="ui-rs.editPatronRequest"
          submitLabelId="ui-rs.save"
          submitDisabled={pristine}
          onClose={close}
        >
          <PatronRequestForm selectOptions={options} onSISelect={form.mutators.handleSISelect} />
        </PatronRequestFormPane>
      )}
    </Form>
  );
};

export default EditRoute;
