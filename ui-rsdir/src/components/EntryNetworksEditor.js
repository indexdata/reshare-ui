import React, { useContext, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import { CalloutContext, useOkapiKy } from '@folio/stripes/core';
import {
  Button,
  Col,
  IconButton,
  KeyValue,
  MultiColumnList,
  Row,
  Select,
} from '@folio/stripes/components';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';

const entryNetworksPath = id => `rsdir/entries/by-id/${id}/networks`;
const networksPath = 'rsdir/networks';
const entryPath = id => `rsdir/entries/by-id/${id}`;

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

  const entryNetworksQuery = useOkapiQuery(entryNetworksPath(id), {
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  const networksQuery = useOkapiQuery(networksPath, {
    staleTime: 2 * 60 * 1000,
  });

  const entryNetworks = useMemo(() => normalizeList(entryNetworksQuery.data), [entryNetworksQuery.data]);
  const networks = useMemo(() => normalizeList(networksQuery.data), [networksQuery.data]);
  const entryNetworkIds = useMemo(() => new Set(entryNetworks.map(network => network.id)), [entryNetworks]);

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
    await queryClient.invalidateQueries(entryNetworksPath(id));
    await queryClient.invalidateQueries(networksPath);
    await queryClient.invalidateQueries(entryPath(id));
    await queryClient.invalidateQueries(['rsdir/entries']);
  };

  const addNetwork = useMutation({
    mutationFn: networkId => ky.post(entryNetworksPath(id), {
      json: { id: networkId },
    }),
    onSuccess: async () => {
      setSelectedNetworkId('');
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
    if (selectedNetworkId) {
      addNetwork.mutate(selectedNetworkId);
    }
  };

  const formatter = {
    name: network => networkLabel(network),
    actions: network => (
      <IconButton
        aria-label={intl.formatMessage({ id: 'ui-rsdir.networks.delete' })}
        disabled={deleteNetwork.isLoading && deletingNetworkId === network.id}
        icon="trash"
        id={`clickable-delete-network-${network.id}`}
        onClick={() => deleteNetwork.mutate(network.id)}
      />
    ),
  };

  if (!entryNetworksQuery.isSuccess || !networksQuery.isSuccess) {
    return null;
  }

  return (
    <div>
      <Row bottom="xs">
        <Col xs={8}>
          <Select
            dataOptions={availableNetworkOptions}
            id="add-entry-network-select"
            label={<FormattedMessage id="ui-rsdir.networks.available" />}
            onChange={event => setSelectedNetworkId(event.target.value)}
            value={selectedNetworkId}
          />
        </Col>
        <Col xs={4}>
          <Button
            buttonStyle="primary"
            disabled={!selectedNetworkId || addNetwork.isLoading}
            id="clickable-add-entry-network"
            onClick={handleAddNetwork}
          >
            <FormattedMessage id="ui-rsdir.networks.add" />
          </Button>
        </Col>
      </Row>
      <MultiColumnList
        contentData={entryNetworks}
        formatter={formatter}
        id="entry-networks-list"
        isEmptyMessage={intl.formatMessage({ id: 'ui-rsdir.networks.empty' })}
        loading={entryNetworksQuery.isFetching || networksQuery.isFetching}
        visibleColumns={['name', 'actions']}
        columnMapping={{
          name: intl.formatMessage({ id: 'ui-rsdir.networks.current' }),
          actions: '',
        }}
      />
    </div>
  );
};

export default EntryNetworksEditor;
