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

const entryTiersPath = id => `rsdir/entries/by-id/${id}/tiers`;
const tiersPath = 'rsdir/tiers';
const entryPath = id => `rsdir/entries/by-id/${id}`;

const normalizeList = data => {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.items || [];
};

const tierLabel = tier => tier?.name || tier?.id || '';

const EntryTiersEditor = ({ id }) => {
  const ky = useOkapiKy();
  const intl = useIntl();
  const callout = useContext(CalloutContext);
  const queryClient = useQueryClient();
  const [selectedTierId, setSelectedTierId] = useState('');
  const [deletingTierId, setDeletingTierId] = useState();

  const entryTiersQuery = useOkapiQuery(entryTiersPath(id), {
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  const tiersQuery = useOkapiQuery(tiersPath, {
    staleTime: 2 * 60 * 1000,
  });

  const entryTiers = useMemo(() => normalizeList(entryTiersQuery.data), [entryTiersQuery.data]);
  const tiers = useMemo(() => normalizeList(tiersQuery.data), [tiersQuery.data]);
  const entryTierIds = useMemo(() => new Set(entryTiers.map(tier => tier.id)), [entryTiers]);

  const availableTierOptions = useMemo(() => [
    {
      label: intl.formatMessage({ id: 'ui-rsdir.tiers.selectTier' }),
      value: '',
    },
    ...tiers
      .filter(tier => tier.id && !entryTierIds.has(tier.id))
      .map(tier => ({
        label: tierLabel(tier),
        value: tier.id,
      })),
  ], [entryTierIds, intl, tiers]);

  const invalidateTierQueries = async () => {
    await queryClient.invalidateQueries(entryTiersPath(id));
    await queryClient.invalidateQueries(tiersPath);
    await queryClient.invalidateQueries(entryPath(id));
    await queryClient.invalidateQueries(['rsdir/entries']);
  };

  const addTier = useMutation({
    mutationFn: tierId => ky.post(entryTiersPath(id), {
      json: { id: tierId },
    }),
    onSuccess: async () => {
      setSelectedTierId('');
      await invalidateTierQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.tiers.add.success" />,
      });
    },
    onError: error => {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.tiers.add.error" />}
            value={error.response?.statusText || error.message}
          />
        ),
      });
    },
  });

  const deleteTier = useMutation({
    mutationFn: tierId => ky.delete(`${entryTiersPath(id)}/${tierId}`),
    onMutate: tierId => {
      setDeletingTierId(tierId);
    },
    onSuccess: async () => {
      await invalidateTierQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.tiers.delete.success" />,
      });
    },
    onError: error => {
      callout.sendCallout({
        type: 'error',
        message: (
          <KeyValue
            label={<FormattedMessage id="ui-rsdir.tiers.delete.error" />}
            value={error.response?.statusText || error.message}
          />
        ),
      });
    },
    onSettled: () => {
      setDeletingTierId();
    },
  });

  const handleAddTier = () => {
    if (selectedTierId) {
      addTier.mutate(selectedTierId);
    }
  };

  const formatter = {
    name: tier => tierLabel(tier),
    actions: tier => (
      <IconButton
        aria-label={intl.formatMessage({ id: 'ui-rsdir.tiers.delete' })}
        disabled={deleteTier.isLoading && deletingTierId === tier.id}
        icon="trash"
        id={`clickable-delete-tier-${tier.id}`}
        onClick={() => deleteTier.mutate(tier.id)}
      />
    ),
  };

  if (!entryTiersQuery.isSuccess || !tiersQuery.isSuccess) {
    return null;
  }

  return (
    <div>
      <Row bottom="xs">
        <Col xs={8}>
          <Select
            dataOptions={availableTierOptions}
            id="add-entry-tier-select"
            label={<FormattedMessage id="ui-rsdir.tiers.available" />}
            onChange={event => setSelectedTierId(event.target.value)}
            value={selectedTierId}
          />
        </Col>
        <Col xs={4}>
          <Button
            buttonStyle="primary"
            disabled={!selectedTierId || addTier.isLoading}
            id="clickable-add-entry-tier"
            onClick={handleAddTier}
          >
            <FormattedMessage id="ui-rsdir.tiers.add" />
          </Button>
        </Col>
      </Row>
      <MultiColumnList
        contentData={entryTiers}
        formatter={formatter}
        id="entry-tiers-list"
        isEmptyMessage={intl.formatMessage({ id: 'ui-rsdir.tiers.empty' })}
        loading={entryTiersQuery.isFetching || tiersQuery.isFetching}
        visibleColumns={['name', 'actions']}
        columnMapping={{
          name: intl.formatMessage({ id: 'ui-rsdir.tiers.current' }),
          actions: '',
        }}
      />
    </div>
  );
};

export default EntryTiersEditor;
