import React, { useContext, useMemo } from 'react';
import { Form } from 'react-final-form';
import { useMutation, useQueryClient } from 'react-query';
import { useHistory, useLocation } from 'react-router-dom';
import { CalloutContext } from '@folio/stripes/core';
import { useCloseDirect, useOkapiKy } from '@projectreshare/stripes-reshare';
import PatronRequestForm from '#/components/PatronRequestForm';
import PatronRequestFormPane from '#/components/PatronRequestForm/PatronRequestFormPane';
import submissionError from '#/components/PatronRequestForm/submissionError';
import useOptions from '#/components/PatronRequestForm/useOptions';
import { formToBroker } from '#/components/PatronRequestForm/formMapping';

const CreateRoute = ({ match }) => {
  const history = useHistory();
  const routerLocation = useLocation();
  const callout = useContext(CalloutContext);
  const queryClient = useQueryClient();
  const okapiKy = useOkapiKy();
  const close = useCloseDirect();
  const { options, isSuccess: optionsLoaded } = useOptions();

  const creator = useMutation({
    mutationFn: (newRecord) => okapiKy
      .post('broker/patron_requests', { json: newRecord }),
    onSuccess: async (res) => {
      const created = await res.json();
      await queryClient.invalidateQueries('broker/patron_requests');

      if (created?.id) {
        // Creation may start at requests/create or requests/create/:prefillId. Either way,
        // replace it with the new request's route and keep any list/aside query parameters.
        const requestsPath = routerLocation.pathname.replace(/\/create(?:\/[^/]+)?$/, '');
        history.replace(`${requestsPath}/${created.id}${routerLocation.search}`);
      } else {
        // Fall back to the request list if the server did not return an id.
        close();
      }
    },
  });

  const prefillId = match.params?.prefillId;
  const onlyLocation = options.locations?.length === 1 ? options.locations[0].value : undefined;
  // Keep initialValues stable so rerenders don't reinitialize the form
  // and undo catalog prefill.
  const initialValues = useMemo(() => ({
    serviceInfo: { serviceType: 'Loan' },
    ...(prefillId && { bibliographicInfo: { supplierUniqueRecordId: prefillId } }),
    ...(onlyLocation && { requesterPickupLocationId: onlyLocation }),
  }), [prefillId, onlyLocation]);

  if (!optionsLoaded) return null;

  const submit = async submittedRecord => {
    const newRecord = formToBroker(submittedRecord, { tiers: options.tiers });
    try {
      await creator.mutateAsync(newRecord);
      return undefined;
    } catch (err) {
      return submissionError(callout, 'ui-rs.create.error', err);
    }
  };

  return (
    <Form onSubmit={submit} initialValues={initialValues} keepDirtyOnReinitialize>
      {({ pristine }) => (
        <PatronRequestFormPane titleId="ui-rs.createPatronRequest" submitDisabled={pristine} onClose={close}>
          <PatronRequestForm selectOptions={options} prefillId={prefillId} requireTier />
        </PatronRequestFormPane>
      )}
    </Form>
  );
};

export default CreateRoute;
