import React, { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import { Form } from 'react-final-form';
import { useMutation, useQueryClient } from 'react-query';
import { Prompt, Redirect, useHistory, useLocation } from 'react-router-dom';
import { Button, Pane, Paneset, PaneFooter, KeyValue } from '@folio/stripes/components';
import { CalloutContext } from '@folio/stripes/core';
import { useCloseDirect, useOkapiKy, useOkapiQuery, upNLevels } from '@projectreshare/stripes-reshare';
import PatronRequestForm from '../components/PatronRequestForm';
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

  const initialValues = brokerToForm(request);

  const submit = async submittedRecord => {
    const updatedRecord = formToBroker(submittedRecord, { operation: EDIT });
    try {
      await editor.mutateAsync(updatedRecord);
    } catch (err) {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rs.edit.error" />}
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
                    id="clickable-cancel-edit-request"
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
                    <FormattedMessage id="ui-rs.save" />
                  </Button>
                }
              />
            }
            paneTitle={<FormattedMessage id="ui-rs.editPatronRequest" />}
          >
            <form onSubmit={handleSubmit}>
              <PatronRequestForm
                selectOptions={options}
                onSISelect={form.mutators.handleSISelect}
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

export default EditRoute;
