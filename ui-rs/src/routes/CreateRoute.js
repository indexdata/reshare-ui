import React, { useContext } from 'react';
import { Form } from 'react-final-form';
import { useMutation, useQueryClient } from 'react-query';
import { useHistory, useLocation } from 'react-router-dom';
import { CalloutContext } from '@folio/stripes/core';
import { useCloseDirect, useOkapiKy } from '@projectreshare/stripes-reshare';
import PatronRequestForm from '../components/PatronRequestForm';
import PatronRequestFormPane from '../components/PatronRequestForm/PatronRequestFormPane';
import submissionError from '../components/PatronRequestForm/submissionError';
import useOptions from '../components/PatronRequestForm/useOptions';
import { formToBroker } from '../components/PatronRequestForm/formMapping';
import handleSISelect from '../components/PatronRequestForm/handleSISelect';

const CreateRoute = () => {
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
        // Creation may start at either requests/create or
        // requests/create/:systemInstanceId. In both cases, replace it with
        // the new request's route and retain any list/aside query parameters.
        const requestsPath = routerLocation.pathname.replace(/\/create(?:\/[^/]+)?$/, '');
        history.replace(`${requestsPath}/${created.id}${routerLocation.search}`);
      } else {
        // Fall back to the request list if the server did not return an id.
        close();
      }
    },
  });

  // Render nothing until the form's select data is loaded, so the whole form
  // paints at once. Below every hook call, as it returns early.
  if (!optionsLoaded) return null;

  const initialValues = {
    // TODO: Broker API
    // copyrightType: defaultCopyrightSetting,
    serviceInfo: { serviceType: 'Loan' },
    ...(options.locations?.length === 1 && {
      requesterPickupLocationId: options.locations[0].value,
    }),
  };

  const reg = /.+\/create\/(\d+)/;
  const sysIdMatch = reg.exec(routerLocation?.pathname);
  const autopopulate = !!sysIdMatch;

  if (autopopulate) {
    initialValues.systemInstanceIdentifier = sysIdMatch[1];
  }

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
    <Form onSubmit={submit} initialValues={initialValues} mutators={{ handleSISelect }} keepDirtyOnReinitialize>
      {({ form, pristine }) => (
        <PatronRequestFormPane titleId="ui-rs.createPatronRequest" submitDisabled={pristine} onClose={close}>
          <PatronRequestForm
            selectOptions={options}
            onSISelect={form.mutators.handleSISelect}
            autopopulate={autopopulate}
            requireTier
          />
        </PatronRequestFormPane>
      )}
    </Form>
  );
};

export default CreateRoute;
