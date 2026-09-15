import React, { useContext, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Form } from 'react-final-form';
import { Prompt } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import { CalloutContext, useOkapiKy } from '@folio/stripes/core';
import {
  Button,
  Col,
  IconButton,
  KeyValue,
  Layout,
  Modal,
  ModalFooter,
  Row,
} from '@folio/stripes/components';
import { SimpleTable, useOkapiQuery } from '@projectreshare/stripes-reshare';
import NetworkForm from './NetworkForm';

const entryPath = id => `directory/entries/by-id/${id}`;
const entryNetworksPath = id => `directory/entries/by-id/${id}/networks`;
const networksPath = 'directory/networks';
const networkPath = id => `${networksPath}/${id}`;
const defaultNetworkValues = { priority: 0.0 };

const normalizeList = data => {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.items || [];
};

const networkLabel = network => network?.name || network?.id || '';

const EntryOwnedNetworksEditor = ({ id }) => {
  const callout = useContext(CalloutContext);
  const intl = useIntl();
  const ky = useOkapiKy();
  const queryClient = useQueryClient();
  const [editingNetwork, setEditingNetwork] = useState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingNetworkId, setDeletingNetworkId] = useState();

  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  const isConsortium = entryQuery.data?.type === 'Consortium';

  const networksQuery = useOkapiQuery(entryNetworksPath(id), {
    staleTime: 2 * 60 * 1000,
    enabled: !!id && isConsortium,
  });

  const networks = useMemo(() => normalizeList(networksQuery.data), [networksQuery.data]);

  const invalidateNetworkQueries = async networkId => {
    await queryClient.invalidateQueries(entryNetworksPath(id));
    await queryClient.invalidateQueries(networksPath);
    await queryClient.invalidateQueries([networksPath]);
    await queryClient.invalidateQueries(entryPath(id));
    await queryClient.invalidateQueries(['directory/entries']);

    if (networkId) {
      await queryClient.invalidateQueries(networkPath(networkId));
    }
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
    mutationFn: values => ky.post(networksPath, {
      json: {
        name: values.name,
        priority: values.priority,
        consortium: id,
      },
    }),
    onSuccess: async () => {
      await invalidateNetworkQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.network.create.success" />,
      });
    },
    onError: error => sendErrorCallout('ui-rsdir.network.create.error', error),
  });

  const updater = useMutation({
    mutationFn: ({ networkId, modifiedFields }) => ky.patch(networkPath(networkId), { json: modifiedFields }),
    onSuccess: async (_data, variables) => {
      await invalidateNetworkQueries(variables.networkId);
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.network.edit.success" />,
      });
    },
    onError: error => sendErrorCallout('ui-rsdir.network.edit.error', error),
  });

  const deleter = useMutation({
    mutationFn: networkId => ky.delete(networkPath(networkId)),
    onMutate: networkId => {
      setDeletingNetworkId(networkId);
    },
    onSuccess: async (_data, networkId) => {
      if (editingNetwork?.id === networkId) {
        setEditingNetwork();
      }

      await invalidateNetworkQueries(networkId);
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.network.delete.success" />,
      });
    },
    onError: error => sendErrorCallout('ui-rsdir.network.delete.error', error),
    onSettled: () => {
      setDeletingNetworkId();
    },
  });

  const submit = (values, form) => {
    if (!editingNetwork) {
      return creator.mutateAsync(values).then(() => {
        form.restart(defaultNetworkValues);
        setIsModalOpen(false);
      });
    }

    const dirtyFields = form.getState().dirtyFields;
    const modifiedFields = {};

    if (dirtyFields.name) {
      modifiedFields.name = values.name;
    }

    if (dirtyFields.priority) {
      modifiedFields.priority = values.priority;
    }

    return updater.mutateAsync({
      networkId: editingNetwork.id,
      modifiedFields,
    }).then(() => {
      setEditingNetwork();
      setIsModalOpen(false);
    });
  };

  const openCreateModal = () => {
    setEditingNetwork();
    setIsModalOpen(true);
  };

  const openEditModal = network => {
    setEditingNetwork(network);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingNetwork();
    setIsModalOpen(false);
  };

  const columns = [
    { key: 'name', label: intl.formatMessage({ id: 'ui-rsdir.networks.current' }), render: networkLabel, sort: true },
    { key: 'priority', label: intl.formatMessage({ id: 'ui-rsdir.network.priority' }), fit: true },
    {
      key: 'actions',
      label: '',
      fit: true,
      render: network => (
        <Layout className="full flex justify-end">
          <IconButton
            aria-label={intl.formatMessage({ id: 'ui-rsdir.network.edit.action' }, { name: networkLabel(network) })}
            icon="edit"
            id={`clickable-edit-network-${network.id}`}
            onClick={() => openEditModal(network)}
          />
          <IconButton
            aria-label={intl.formatMessage({ id: 'ui-rsdir.networks.delete.action' }, { name: networkLabel(network) })}
            disabled={deleter.isLoading && deletingNetworkId === network.id}
            icon="trash"
            id={`clickable-delete-network-${network.id}`}
            onClick={() => deleter.mutate(network.id)}
          />
        </Layout>
      ),
    },
  ];

  if (!entryQuery.isSuccess) {
    return null;
  }

  if (!isConsortium) {
    return (
      <KeyValue
        label={<FormattedMessage id="ui-rsdir.networks.invalidEntryType.label" />}
        value={<FormattedMessage id="ui-rsdir.networks.invalidEntryType" />}
      />
    );
  }

  if (!networksQuery.isSuccess) {
    return null;
  }

  return (
    <div>
      <Row end="xs">
        <Col xs={12}>
          <Button
            buttonStyle="primary"
            id="clickable-add-entry-owned-network"
            onClick={openCreateModal}
          >
            <FormattedMessage id="ui-rsdir.add" />
          </Button>
        </Col>
      </Row>
      {isModalOpen && (
        <Form
          key={editingNetwork?.id || 'create'}
          onSubmit={submit}
          initialValues={editingNetwork ? { ...defaultNetworkValues, ...editingNetwork } : defaultNetworkValues}
          keepDirtyOnReinitialize
        >
          {({ dirty, handleSubmit, pristine, submitting, invalid }) => (
            <Modal
              dismissible
              id="entry-owned-network-modal"
              label={
                editingNetwork
                  ? <FormattedMessage id="ui-rsdir.network.edit" values={{ name: networkLabel(editingNetwork) }} />
                  : <FormattedMessage id="ui-rsdir.network.create" />
              }
              onClose={closeModal}
              open
            >
              <form onSubmit={handleSubmit} id="form-entry-owned-network">
                <NetworkForm />
                <FormattedMessage id="ui-rsdir.confirmDirtyNavigate">
                  {prompt => <Prompt when={dirty && !submitting} message={prompt[0]} />}
                </FormattedMessage>
                <ModalFooter>
                  <Button
                    buttonStyle="primary"
                    disabled={pristine || submitting || invalid}
                    id="clickable-save-entry-owned-network"
                    onClick={handleSubmit}
                    type="submit"
                  >
                    <FormattedMessage id={editingNetwork ? 'ui-rsdir.edit.submit' : 'ui-rsdir.create'} />
                  </Button>
                  <Button
                    buttonStyle="default"
                    id="clickable-cancel-entry-owned-network"
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
        id="entry-owned-networks-list"
        defaultSortColumn="name"
        caption={intl.formatMessage({ id: 'ui-rsdir.entry.section.networks' })}
        columns={columns}
        rows={networks}
        emptyMessage={intl.formatMessage({ id: 'ui-rsdir.networks.empty' })}
        loading={networksQuery.isFetching}
      />
    </div>
  );
};

export default EntryOwnedNetworksEditor;
