import React, { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import { Form } from 'react-final-form';
import { Prompt, useHistory, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import {
  Button,
  KeyValue,
  Pane,
  PaneFooter,
} from '@folio/stripes/components';
import { CalloutContext, useOkapiKy } from '@folio/stripes/core';
import { useCloseDirect, useOkapiQuery } from '@projectreshare/stripes-reshare';
import NetworkForm from '../components/NetworkForm';

const CREATE = 'create';
const EDIT = 'edit';
const networksPath = 'rsdir/networks';
const networkPath = id => `${networksPath}/${id}`;
const defaultNetworkValues = { priority: 0.0 };

const EditNetworkRoute = () => {
  const { id } = useParams();
  const history = useHistory();
  const location = useLocation();
  const callout = useContext(CalloutContext);
  const queryClient = useQueryClient();
  const okapiKy = useOkapiKy();

  const op = id ? EDIT : CREATE;
  const listPath = `/rsdir/networks${location.search}`;
  const close = useCloseDirect(listPath);

  const networkQuery = useOkapiQuery(networkPath(id), {
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  const invalidateNetworkQueries = async () => {
    await queryClient.invalidateQueries(networksPath);
    await queryClient.invalidateQueries(['rsdir/networks']);
    if (id) {
      await queryClient.invalidateQueries(networkPath(id));
    }
  };

  const creator = useMutation({
    mutationFn: newRecord => okapiKy
      .post(networksPath, { json: newRecord })
      .then(res => res.json()),
    onSuccess: async createdNetwork => {
      await invalidateNetworkQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.network.create.success" />,
      });

      if (createdNetwork?.id) {
        history.push(`/rsdir/networks/edit/${createdNetwork.id}${location.search}`);
      } else {
        close();
      }
    },
    onError: err => {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.network.create.error" />}
            value={err.response?.statusText || err.message}
          />
        ),
      });
    },
  });

  const updater = useMutation({
    mutationFn: modifiedFields => okapiKy.patch(networkPath(id), { json: modifiedFields }),
    onSuccess: async () => {
      await invalidateNetworkQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.network.edit.success" />,
      });
      close();
    },
    onError: err => {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.network.edit.error" />}
            value={err.response?.statusText || err.message}
          />
        ),
      });
    },
  });

  const deleter = useMutation({
    mutationFn: () => okapiKy.delete(networkPath(id)),
    onSuccess: async () => {
      await invalidateNetworkQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.network.delete.success" />,
      });
      close();
    },
    onError: err => {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.network.delete.error" />}
            value={err.response?.statusText || err.message}
          />
        ),
      });
    },
  });

  if (op === EDIT && !networkQuery.isSuccess) return null;

  const initialValues = op === CREATE ? defaultNetworkValues : { ...defaultNetworkValues, ...networkQuery.data };

  const submit = (values, form) => {
    if (op === CREATE) {
      return creator.mutateAsync(values);
    }

    const dirtyFields = form.getState().dirtyFields;
    const modifiedFields = {};

    Object.keys(dirtyFields).forEach(key => {
      if (dirtyFields[key]) {
        modifiedFields[key] = values[key];
      }
    });

    return updater.mutateAsync(modifiedFields);
  };

  const getFooter = (handleSubmit, pristine, submitting, invalid) => {
    const cancelButton = (
      <Button
        buttonStyle="default mega"
        id="clickable-cancel-network"
        marginBottom0
        onClick={close}
      >
        <FormattedMessage id="ui-rsdir.cancel" />
      </Button>
    );

    const deleteButton = op === EDIT ? (
      <Button
        buttonStyle="danger mega"
        disabled={deleter.isLoading || submitting}
        id="clickable-delete-network"
        marginBottom0
        onClick={() => deleter.mutate()}
      >
        <FormattedMessage id="ui-rsdir.networks.delete" />
      </Button>
    ) : null;

    const saveButton = (
      <Button
        buttonStyle="primary mega"
        disabled={pristine || submitting || invalid}
        id="clickable-save-network"
        marginBottom0
        onClick={handleSubmit}
        type="submit"
      >
        <FormattedMessage id={op === CREATE ? 'ui-rsdir.create' : 'ui-rsdir.edit.submit'} />
      </Button>
    );

    return (
      <PaneFooter
        renderStart={(
          <>
            {cancelButton}
            {deleteButton}
          </>
        )}
        renderEnd={saveButton}
      />
    );
  };

  return (
    <Form
      onSubmit={submit}
      initialValues={initialValues}
      keepDirtyOnReinitialize
    >
      {({ handleSubmit, pristine, submitting, submitSucceeded, invalid }) => (
        <Pane
          defaultWidth="fill"
          centerContent
          dismissible
          footer={getFooter(handleSubmit, pristine, submitting, invalid)}
          onClose={close}
          paneTitle={
            op === CREATE
              ? <FormattedMessage id="ui-rsdir.network.create" />
              : <FormattedMessage id="ui-rsdir.network.edit" values={{ name: initialValues.name }} />
          }
        >
          <form onSubmit={handleSubmit} id="form-network">
            <NetworkForm />
          </form>
          <FormattedMessage id="ui-rsdir.confirmDirtyNavigate">
            {prompt => <Prompt when={!pristine && !(submitting || submitSucceeded)} message={prompt[0]} />}
          </FormattedMessage>
        </Pane>
      )}
    </Form>
  );
};

export default EditNetworkRoute;
