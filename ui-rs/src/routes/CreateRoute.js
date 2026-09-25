import React, { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import { Form } from 'react-final-form';
import { useMutation, useQueryClient } from 'react-query';
import { Prompt, useHistory, useLocation } from 'react-router-dom';
import { Button, Pane, Paneset, PaneFooter, KeyValue } from '@folio/stripes/components';
import { CalloutContext } from '@folio/stripes/core';
import { useCloseDirect, useOkapiKy } from '@projectreshare/stripes-reshare';
import PatronRequestForm from '../components/PatronRequestForm';
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
    const newRecord = formToBroker(submittedRecord);
    // TODO: pending tiers, which will supply the level for the chosen tier.
    // Create only: an edit leaves whatever level the request already carries.
    newRecord.illRequest.serviceInfo = {
      ...newRecord.illRequest.serviceInfo,
      serviceLevel: { '#text': 'Standard' },
    };
    try {
      await creator.mutateAsync(newRecord);
    } catch (err) {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rs.create.error" />}
            value={err?.message || ''}
          />
        ),
      });
    }
  };

  return (
    <Paneset>
      <Form onSubmit={submit} initialValues={initialValues} mutators={{ handleSISelect }} keepDirtyOnReinitialize>
        {({ form, handleSubmit, pristine, submitting, submitSucceeded }) => (
          <Pane
            defaultWidth="100%"
            centerContent
            onClose={close}
            dismissible
            footer={
              <PaneFooter
                renderStart={
                  <Button
                    id="clickable-cancel-create-request"
                    buttonStyle="default mega"
                    marginBottom0
                    onClick={close}
                  >
                    <FormattedMessage id="stripes-core.button.cancel" />
                  </Button>
                }
                renderEnd={
                  <Button
                    type="submit"
                    disabled={pristine || submitting}
                    onClick={handleSubmit}
                    buttonStyle="primary mega"
                    marginBottom0
                  >
                    <FormattedMessage id="ui-rs.createPatronRequest" />
                  </Button>
                }
              />
            }
            paneTitle={<FormattedMessage id="ui-rs.createPatronRequest" />}
          >
            <form onSubmit={handleSubmit}>
              <PatronRequestForm
                selectOptions={options}
                onSISelect={form.mutators.handleSISelect}
                autopopulate={autopopulate}
              />
            </form>
            <FormattedMessage id="ui-rs.confirmDirtyNavigate">
              {prompt => <Prompt when={!pristine && !(submitting || submitSucceeded)} message={prompt[0]} />}
            </FormattedMessage>
          </Pane>
        )}
      </Form>
    </Paneset>
  );
};

export default CreateRoute;
