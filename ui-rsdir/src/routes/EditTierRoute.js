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
import TierForm from '../components/TierForm';

const CREATE = 'create';
const EDIT = 'edit';
const tiersPath = 'rsdir/tiers';
const tierPath = id => `${tiersPath}/${id}`;
const defaultTierValues = {
  level: 'standard',
  type: 'loan',
  cost: 0.0,
};

const EditTierRoute = () => {
  const { id } = useParams();
  const history = useHistory();
  const location = useLocation();
  const callout = useContext(CalloutContext);
  const queryClient = useQueryClient();
  const okapiKy = useOkapiKy();

  const op = id ? EDIT : CREATE;
  const listPath = `/rsdir/tiers${location.search}`;
  const close = useCloseDirect(listPath);

  const tierQuery = useOkapiQuery(tierPath(id), {
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  const invalidateTierQueries = async () => {
    await queryClient.invalidateQueries(tiersPath);
    await queryClient.invalidateQueries(['rsdir/tiers']);
    if (id) {
      await queryClient.invalidateQueries(tierPath(id));
    }
  };

  const creator = useMutation({
    mutationFn: newRecord => okapiKy
      .post(tiersPath, { json: newRecord })
      .then(res => res.json()),
    onSuccess: async createdTier => {
      await invalidateTierQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.tier.create.success" />,
      });

      if (createdTier?.id) {
        history.push(`/rsdir/tiers/edit/${createdTier.id}${location.search}`);
      } else {
        close();
      }
    },
    onError: err => {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.tier.create.error" />}
            value={err.response?.statusText || err.message}
          />
        ),
      });
    },
  });

  const updater = useMutation({
    mutationFn: modifiedFields => okapiKy.patch(tierPath(id), { json: modifiedFields }),
    onSuccess: async () => {
      await invalidateTierQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.tier.edit.success" />,
      });
      close();
    },
    onError: err => {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.tier.edit.error" />}
            value={err.response?.statusText || err.message}
          />
        ),
      });
    },
  });

  const deleter = useMutation({
    mutationFn: () => okapiKy.delete(tierPath(id)),
    onSuccess: async () => {
      await invalidateTierQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.tier.delete.success" />,
      });
      close();
    },
    onError: err => {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.tier.delete.error" />}
            value={err.response?.statusText || err.message}
          />
        ),
      });
    },
  });

  if (op === EDIT && !tierQuery.isSuccess) return null;

  const initialValues = op === CREATE ? defaultTierValues : { ...defaultTierValues, ...tierQuery.data };

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
        id="clickable-cancel-tier"
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
        id="clickable-delete-tier"
        marginBottom0
        onClick={() => deleter.mutate()}
      >
        <FormattedMessage id="ui-rsdir.tiers.delete" />
      </Button>
    ) : null;

    const saveButton = (
      <Button
        buttonStyle="primary mega"
        disabled={pristine || submitting || invalid}
        id="clickable-save-tier"
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
              ? <FormattedMessage id="ui-rsdir.tier.create" />
              : <FormattedMessage id="ui-rsdir.tier.edit" values={{ name: initialValues.name }} />
          }
        >
          <form onSubmit={handleSubmit} id="form-tier">
            <TierForm />
          </form>
          <FormattedMessage id="ui-rsdir.confirmDirtyNavigate">
            {prompt => <Prompt when={!pristine && !(submitting || submitSucceeded)} message={prompt[0]} />}
          </FormattedMessage>
        </Pane>
      )}
    </Form>
  );
};

export default EditTierRoute;
