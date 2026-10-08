import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { CalloutContext, useOkapiKy } from '@folio/stripes/core';
import {
  Button,
  Col,
  IconButton,
  KeyValue,
  Row,
  Select,
  TextField,
} from '@folio/stripes/components';
import { SimpleTable, useOkapiQuery } from '@projectreshare/stripes-reshare';

const entryNetworksPath = id => `directory/entries/by-id/${id}/networks`;
const networksPath = 'directory/networks';
const membershipsPath = 'directory/entry-networks';
const membershipPageSize = 1000;
const validPriority = value => /^-?\d+$/.test(value) &&
  Number(value) >= -2147483648 && Number(value) <= 2147483647;

const entryPath = id => `directory/entries/by-id/${id}`;

const normalizeList = data => {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.items || [];
};

const networkLabel = network => network?.name || network?.id || '';

const EntryNetworksEditor = ({ id }) => {
  const ky = useOkapiKy();
  const intl = useIntl();
  const callout = useContext(CalloutContext);
  const queryClient = useQueryClient();
  const [selectedNetworkId, setSelectedNetworkId] = useState('');
  const [deletingNetworkId, setDeletingNetworkId] = useState();
  const [newPriority, setNewPriority] = useState('0');
  const [editingPriority, setEditingPriority] = useState();

  useEffect(() => {
    setSelectedNetworkId('');
    setNewPriority('0');
    setEditingPriority();
  }, [id]);

  const membershipQueryKey = [membershipsPath, { entry: id }];
  const priorityError = intl.formatMessage({ id: 'ui-rsdir.network.priority.invalid' });

  const membershipsQuery = useQuery(membershipQueryKey, async ({ signal }) => {
    const memberships = [];
    let offset = 0;
    let page;

    do {
      const data = await ky(membershipsPath, {
        signal,
        searchParams: { q: `entry=${id}`, limit: membershipPageSize, offset },
      }).json();
      page = normalizeList(data);
      memberships.push(...page);
      offset += page.length;
    } while (page.length === membershipPageSize);

    return memberships;
  }, {
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    retry: false,
    useErrorBoundary: false,
  });
  const membershipByNetwork = useMemo(() => new Map(
    (membershipsQuery.data || []).map(membership => [membership.network, membership])
  ), [membershipsQuery.data]);

  const entryNetworksQuery = useOkapiQuery(entryNetworksPath(id), {
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  const networksQuery = useOkapiQuery(networksPath, {
    staleTime: 2 * 60 * 1000,
    searchParams: {
      limit: '1000',
    },
  });

  const entryNetworks = useMemo(() => normalizeList(entryNetworksQuery.data), [entryNetworksQuery.data]);
  const networks = useMemo(() => normalizeList(networksQuery.data), [networksQuery.data]);
  const entryNetworkIds = useMemo(() => new Set(entryNetworks.map(network => network.id)), [entryNetworks]);

  useEffect(() => {
    if (entryNetworksQuery.isSuccess && editingPriority?.entryId === id &&
      !entryNetworkIds.has(editingPriority.networkId)) {
      setEditingPriority();
    }
  }, [editingPriority, entryNetworkIds, entryNetworksQuery.isSuccess, id]);

  const availableNetworkOptions = useMemo(() => [
    {
      label: intl.formatMessage({ id: 'ui-rsdir.networks.selectNetwork' }),
      value: '',
    },
    ...networks
      .filter(network => network.id && !entryNetworkIds.has(network.id))
      .map(network => ({
        label: networkLabel(network),
        value: network.id,
      })),
  ], [entryNetworkIds, intl, networks]);

  const invalidateNetworkQueries = async () => {
    await queryClient.invalidateQueries(membershipQueryKey);
    await queryClient.invalidateQueries(entryNetworksPath(id));
    await queryClient.invalidateQueries(networksPath);
    await queryClient.invalidateQueries(entryPath(id));
    await queryClient.invalidateQueries(['directory/entries']);
  };

  const addNetwork = useMutation({
    mutationFn: ({ networkId, priority }) => ky.post(entryNetworksPath(id), {
      json: { id: networkId, priority },
    }),
    onSuccess: async () => {
      setSelectedNetworkId('');
      setNewPriority('0');
      await invalidateNetworkQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.networks.add.success" />,
      });
    },
    onError: error => {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.networks.add.error" />}
            value={error.response?.statusText || error.message}
          />
        ),
      });
    },
  });

  const updatePriority = useMutation({
    mutationFn: ({ membershipId, priority }) => ky.patch(`${membershipsPath}/${membershipId}`, {
      json: { priority },
    }),
    onSuccess: async () => {
      await invalidateNetworkQueries();
      setEditingPriority();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.network.priority.update.success" />,
      });
    },
    onError: error => {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.network.priority.update.error" />}
            value={error.response?.statusText || error.message}
          />
        ),
      });
    },
  });

  const deleteNetwork = useMutation({
    mutationFn: networkId => ky.delete(`${entryNetworksPath(id)}/${networkId}`),
    onMutate: networkId => {
      setDeletingNetworkId(networkId);
    },
    onSuccess: async () => {
      await invalidateNetworkQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.networks.delete.success" />,
      });
    },
    onError: error => {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.networks.delete.error" />}
            value={error.response?.statusText || error.message}
          />
        ),
      });
    },
    onSettled: () => {
      setDeletingNetworkId();
    },
  });

  const handleAddNetwork = () => {
    if (selectedNetworkId && validPriority(newPriority) && !addNetwork.isLoading) {
      addNetwork.mutate({ networkId: selectedNetworkId, priority: Number(newPriority) });
    }
  };

  const columns = [
    { key: 'name', label: intl.formatMessage({ id: 'ui-rsdir.networks.current' }), render: networkLabel, sort: true },
    {
      key: 'priority',
      label: intl.formatMessage({ id: 'ui-rsdir.network.priority' }),
      fit: !editingPriority,
      sort: (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
      render: network => {
        const membership = membershipByNetwork.get(network.id);
        const editing = editingPriority?.entryId === id && editingPriority.networkId === network.id;

        if (editing) {
          return (
            <>
              <TextField
                autoFocus
                aria-label={intl.formatMessage({ id: 'ui-rsdir.network.priority.forNetwork' }, { name: networkLabel(network) })}
                disabled={updatePriority.isLoading}
                error={validPriority(editingPriority.value) ? undefined : priorityError}
                id={`edit-network-priority-${network.id}`}
                min={-2147483648}
                max={2147483647}
                step={1}
                type="number"
                value={editingPriority.value}
                onChange={event => setEditingPriority({ ...editingPriority, value: event.target.value })}
              />
              <Button
                disabled={updatePriority.isLoading || !validPriority(editingPriority.value) ||
                  Number(editingPriority.value) === editingPriority.originalValue || !membership?.id || !membershipsQuery.isSuccess}
                onClick={() => updatePriority.mutate({ membershipId: membership.id, priority: Number(editingPriority.value) })}
              >
                <FormattedMessage id="ui-rsdir.network.priority.save" />
              </Button>
              <Button disabled={updatePriority.isLoading} onClick={() => setEditingPriority()}>
                <FormattedMessage id="ui-rsdir.network.priority.cancel" />
              </Button>
            </>
          );
        }

        return (
          <>
            {network.priority ?? ''}
            <IconButton
              aria-label={intl.formatMessage({ id: 'ui-rsdir.network.priority.edit' }, { name: networkLabel(network) })}
              disabled={!membershipsQuery.isSuccess || !membership?.id || !!editingPriority || deleteNetwork.isLoading}
              icon="edit"
              id={`clickable-edit-network-priority-${network.id}`}
              onClick={() => setEditingPriority({
                entryId: id,
                networkId: network.id,
                value: String(network.priority ?? membership.priority),
                originalValue: network.priority ?? membership.priority,
              })}
            />
          </>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      fit: true,
      render: network => (
        <IconButton
          aria-label={intl.formatMessage({ id: 'ui-rsdir.networks.delete.action' }, { name: networkLabel(network) })}
          disabled={(deleteNetwork.isLoading && deletingNetworkId === network.id) ||
            (editingPriority?.entryId === id && editingPriority.networkId === network.id)}
          icon="trash"
          id={`clickable-delete-network-${network.id}`}
          onClick={() => deleteNetwork.mutate(network.id)}
        />
      ),
    },
  ];

  if (!entryNetworksQuery.isSuccess || !networksQuery.isSuccess) {
    return null;
  }

  return (
    <div>
      <Row bottom="xs">
        <Col xs={6}>
          <Select
            dataOptions={availableNetworkOptions}
            disabled={addNetwork.isLoading}
            id="add-entry-network-select"
            label={<FormattedMessage id="ui-rsdir.networks.available" />}
            onChange={event => setSelectedNetworkId(event.target.value)}
            value={selectedNetworkId}
          />
        </Col>
        <Col xs={3}>
          <TextField
            id="add-entry-network-priority"
            label={<FormattedMessage id="ui-rsdir.network.priority" />}
            type="number"
            min={-2147483648}
            max={2147483647}
            step={1}
            value={newPriority}
            disabled={addNetwork.isLoading}
            error={validPriority(newPriority) ? undefined : priorityError}
            onChange={event => setNewPriority(event.target.value)}
          />
        </Col>
        <Col xs={3}>
          <Button
            buttonStyle="primary"
            disabled={!selectedNetworkId || !validPriority(newPriority) || addNetwork.isLoading}
            id="clickable-add-entry-network"
            onClick={handleAddNetwork}
          >
            <FormattedMessage id="ui-rsdir.networks.add" />
          </Button>
        </Col>
      </Row>
      {membershipsQuery.isError && (
        <div role="alert">
          <FormattedMessage id="ui-rsdir.network.priority.load.error" />
        </div>
      )}
      <SimpleTable
        id="entry-networks-list"
        defaultSortColumn="name"
        caption={intl.formatMessage({ id: 'ui-rsdir.entry.section.networks' })}
        columns={columns}
        rows={entryNetworks}
        emptyMessage={intl.formatMessage({ id: 'ui-rsdir.networks.empty' })}
        loading={entryNetworksQuery.isFetching || networksQuery.isFetching}
      />
    </div>
  );
};

export default EntryNetworksEditor;
