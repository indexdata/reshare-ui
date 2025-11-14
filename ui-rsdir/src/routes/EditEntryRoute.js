import React, { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import { Form } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import { useMutation, useQueryClient } from 'react-query';
import { Prompt, useParams, useHistory } from 'react-router-dom';
import { Button, Pane, Paneset, PaneFooter, KeyValue } from '@folio/stripes/components';
import { CalloutContext, useOkapiKy } from '@folio/stripes/core';
import { useCloseDirect, useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryForm from '../components/EntryForm';

// Possible operations performed by submitting this form
const CREATE = 'create';
const EDIT = 'edit';

const EditEntryRoute = () => {
  const { id } = useParams();
  const history = useHistory();
  const callout = useContext(CalloutContext);
  const queryClient = useQueryClient();
  const okapiKy = useOkapiKy();

  const op = id ? EDIT : CREATE;

  const close = useCloseDirect(op === CREATE ? '/rsdir/entries' : `/rsdir/entries/view/${id}`);

  const entryQuery = useOkapiQuery(`rsdir/entries/by-id/${id}`, {
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  const creator = useMutation({
    mutationFn: (newRecord) => okapiKy
      .post('rsdir/entries', { json: newRecord })
      .then((res) => res.json()),
    onSuccess: async (createdEntry) => {
      await queryClient.invalidateQueries(['rsdir/entries']);
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.create.success" />
      });
      history.push(`/rsdir/entries/view/${createdEntry.id}`);
    },
    onError: async (err) => {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.create.error" />}
            value={err.response?.statusText || ''}
          />
        )
      });
    },
  });

  const updater = useMutation({
    mutationFn: (modifiedFields) => okapiKy
      .patch(`rsdir/entries/by-id/${id}`, { json: modifiedFields }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(`rsdir/entries/by-id/${id}`);
      await queryClient.invalidateQueries(['rsdir/entries']);
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.edit.success" />
      });
      close();
    },
    onError: async (err) => {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.edit.error" />}
            value={err.response?.statusText || ''}
          />
        )
      });
    },
  });

  if (op === EDIT && !entryQuery.isSuccess) return null;

  const initialValues = op === CREATE ? {} : entryQuery.data;

  const submit = (values, form) => {
    if (op === CREATE) {
      return creator.mutateAsync(values);
    }

    // For PATCH, use Final Form's dirtyFields to get only modified fields
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
        id="clickable-cancel"
        marginBottom0
        onClick={close}
      >
        <FormattedMessage id="ui-rsdir.cancel" />
      </Button>
    );

    const saveButton = (
      <Button
        buttonStyle="primary mega"
        id="clickable-save-entry"
        marginBottom0
        type="submit"
        disabled={pristine || submitting || invalid}
        onClick={handleSubmit}
      >
        <FormattedMessage id={op === CREATE ? 'ui-rsdir.create' : 'ui-rsdir.edit.submit'} />
      </Button>
    );

    return (
      <PaneFooter
        renderStart={cancelButton}
        renderEnd={saveButton}
      />
    );
  };

  return (
    <Paneset>
      <Form
        onSubmit={submit}
        initialValues={initialValues}
        mutators={{ ...arrayMutators }}
        keepDirtyOnReinitialize
      >
        {({ handleSubmit, pristine, submitting, submitSucceeded, invalid }) => (
          <Pane
            defaultWidth="100%"
            centerContent
            onClose={close}
            dismissible
            footer={getFooter(handleSubmit, pristine, submitting, invalid)}
            paneTitle={
              op === CREATE
                ? <FormattedMessage id="ui-rsdir.createEntry" />
                : <FormattedMessage id="ui-rsdir.editEntry" values={{ name: initialValues.name }} />
            }
          >
            <form onSubmit={handleSubmit} id="form-entry">
              <EntryForm />
            </form>
            <FormattedMessage id="ui-rsdir.confirmDirtyNavigate">
              {prompt => <Prompt when={!pristine && !(submitting || submitSucceeded)} message={prompt[0]} />}
            </FormattedMessage>
          </Pane>
        )}
      </Form>
    </Paneset>
  );
};

export default EditEntryRoute;
