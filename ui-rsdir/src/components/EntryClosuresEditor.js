import React, { useContext, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Form } from 'react-final-form';
import { Prompt } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import { CalloutContext, useOkapiKy } from '@folio/stripes/core';
import {
  Button,
  Col,
  FormattedUTCDate,
  IconButton,
  KeyValue,
  Layout,
  Modal,
  ModalFooter,
  Row,
} from '@folio/stripes/components';
import { SimpleTable, useOkapiQuery } from '@projectreshare/stripes-reshare';
import ClosureForm, { validateClosure } from './ClosureForm';

const entryPath = id => `directory/entries/by-id/${id}`;
const closuresPath = 'directory/closures';
const closurePath = id => `${closuresPath}/${id}`;
const CLOSURE_FIELDS = ['startDate', 'endDate', 'reason'];

// ISO date strings sort lexically; use the other date and id to break ties.
const byDate = (column, other) => (a, b) => (
  String(a[column]).localeCompare(String(b[column]))
  || String(a[other]).localeCompare(String(b[other]))
  || String(a.id).localeCompare(String(b.id))
);

const EntryClosuresEditor = ({ id }) => {
  const callout = useContext(CalloutContext);
  const intl = useIntl();
  const ky = useOkapiKy();
  const queryClient = useQueryClient();
  const [editingClosure, setEditingClosure] = useState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingClosureId, setDeletingClosureId] = useState();

  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  const closures = entryQuery.data?.closures || [];

  const invalidateClosureQueries = async () => {
    await queryClient.invalidateQueries(entryPath(id));
    await queryClient.invalidateQueries(['directory/entries']);
  };

  const sendErrorCallout = (labelId, error) => {
    callout.sendCallout({
      type: 'error',
      message: (
        <KeyValue
          label={<FormattedMessage id={labelId} />}
          value={error.response?.statusText || error.message}
        />
      ),
    });
  };

  const creator = useMutation({
    mutationFn: values => ky.post(closuresPath, {
      json: {
        entry: id,
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason,
      },
    }),
    onSuccess: async () => {
      await invalidateClosureQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.closure.create.success" />,
      });
    },
    onError: error => sendErrorCallout('ui-rsdir.closure.create.error', error),
  });

  const updater = useMutation({
    mutationFn: ({ closureId, modifiedFields }) => ky.patch(closurePath(closureId), { json: modifiedFields }),
    onSuccess: async () => {
      await invalidateClosureQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.closure.edit.success" />,
      });
    },
    onError: error => sendErrorCallout('ui-rsdir.closure.edit.error', error),
  });

  const deleter = useMutation({
    mutationFn: closureId => ky.delete(closurePath(closureId)),
    onMutate: closureId => {
      setDeletingClosureId(closureId);
    },
    onSuccess: async (_data, closureId) => {
      if (editingClosure?.id === closureId) {
        setEditingClosure();
      }

      await invalidateClosureQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.closure.delete.success" />,
      });
    },
    onError: error => sendErrorCallout('ui-rsdir.closure.delete.error', error),
    onSettled: () => {
      setDeletingClosureId();
    },
  });

  const submit = (values, form) => {
    if (!editingClosure) {
      return creator.mutateAsync(values).then(() => {
        form.restart({});
        setIsModalOpen(false);
      });
    }

    const dirtyFields = form.getState().dirtyFields;
    const modifiedFields = {};

    CLOSURE_FIELDS.forEach(fieldName => {
      if (dirtyFields[fieldName]) {
        modifiedFields[fieldName] = values[fieldName];
      }
    });

    return updater.mutateAsync({
      closureId: editingClosure.id,
      modifiedFields,
    }).then(() => {
      setEditingClosure();
      setIsModalOpen(false);
    });
  };

  const openCreateModal = () => {
    setEditingClosure();
    setIsModalOpen(true);
  };

  const openEditModal = closure => {
    setEditingClosure(closure);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingClosure();
    setIsModalOpen(false);
  };

  const date = value => (value ? <FormattedUTCDate value={value} /> : '');

  const columns = [
    {
      key: 'startDate',
      label: intl.formatMessage({ id: 'ui-rsdir.closure.startDate.column' }),
      render: closure => date(closure.startDate),
      sort: byDate('startDate', 'endDate'),
      defaultDirection: 'descending',
      fit: true,
    },
    {
      key: 'endDate',
      label: intl.formatMessage({ id: 'ui-rsdir.closure.endDate.column' }),
      render: closure => date(closure.endDate),
      sort: byDate('endDate', 'startDate'),
      defaultDirection: 'descending',
      fit: true,
    },
    {
      key: 'reason',
      label: intl.formatMessage({ id: 'ui-rsdir.closure.reason' }),
    },
    {
      key: 'actions',
      label: '',
      fit: true,
      render: closure => (
        <Layout className="full flex justify-end">
          <IconButton
            aria-label={intl.formatMessage({ id: 'ui-rsdir.closure.edit.action' }, { reason: closure.reason })}
            icon="edit"
            id={`clickable-edit-closure-${closure.id}`}
            onClick={() => openEditModal(closure)}
          />
          <IconButton
            aria-label={intl.formatMessage({ id: 'ui-rsdir.closures.delete' }, { reason: closure.reason })}
            disabled={deleter.isLoading && deletingClosureId === closure.id}
            icon="trash"
            id={`clickable-delete-closure-${closure.id}`}
            onClick={() => deleter.mutate(closure.id)}
          />
        </Layout>
      ),
    },
  ];

  if (!entryQuery.isSuccess) {
    return null;
  }

  return (
    <div>
      <Row end="xs">
        <Col xs={12}>
          <Button
            buttonStyle="primary"
            id="clickable-add-closure"
            onClick={openCreateModal}
          >
            <FormattedMessage id="ui-rsdir.add" />
          </Button>
        </Col>
      </Row>
      {isModalOpen && (
        <Form
          key={editingClosure?.id || 'create'}
          onSubmit={submit}
          initialValues={editingClosure}
          validate={validateClosure}
          keepDirtyOnReinitialize
        >
          {({ dirty, handleSubmit, pristine, submitting, invalid }) => (
            <Modal
              dismissible={!submitting}
              id="closure-modal"
              label={
                editingClosure
                  ? <FormattedMessage id="ui-rsdir.closure.edit" values={{ reason: editingClosure.reason }} />
                  : <FormattedMessage id="ui-rsdir.closure.create" />
              }
              onClose={submitting ? undefined : closeModal}
              open
            >
              <form onSubmit={handleSubmit} id="form-closure">
                <ClosureForm />
                <FormattedMessage id="ui-rsdir.confirmDirtyNavigate">
                  {prompt => <Prompt when={dirty && !submitting} message={prompt[0]} />}
                </FormattedMessage>
                <ModalFooter>
                  <Button
                    buttonStyle="primary"
                    disabled={pristine || submitting || invalid}
                    id="clickable-save-closure"
                    onClick={handleSubmit}
                    type="submit"
                  >
                    <FormattedMessage id={editingClosure ? 'ui-rsdir.edit.submit' : 'ui-rsdir.create'} />
                  </Button>
                  <Button
                    buttonStyle="default"
                    disabled={submitting}
                    id="clickable-cancel-closure"
                    onClick={closeModal}
                  >
                    <FormattedMessage id="ui-rsdir.cancel" />
                  </Button>
                </ModalFooter>
              </form>
            </Modal>
          )}
        </Form>
      )}
      <SimpleTable
        id="entry-closures-list"
        caption={intl.formatMessage({ id: 'ui-rsdir.entry.section.closures' })}
        columns={columns}
        rows={closures}
        emptyMessage={intl.formatMessage({ id: 'ui-rsdir.closures.empty' })}
        loading={entryQuery.isFetching}
        defaultSortColumn="startDate"
      />
    </div>
  );
};

export default EntryClosuresEditor;
