import React, { useContext, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Form } from 'react-final-form';
import { Prompt } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import { CalloutContext, useOkapiKy, useStripes } from '@folio/stripes/core';
import {
  Button,
  Col,
  IconButton,
  KeyValue,
  Modal,
  ModalFooter,
  Row,
} from '@folio/stripes/components';
import { SimpleTable, useOkapiQuery } from '@projectreshare/stripes-reshare';
import TierForm from './TierForm';

const entryPath = id => `directory/entries/by-id/${id}`;
const entryTiersPath = id => `directory/entries/by-id/${id}/tiers`;
const tiersPath = 'directory/tiers';
const tierPath = id => `${tiersPath}/${id}`;
const defaultTierValues = {
  level: 'standard',
  type: 'loan',
  cost: 0.0,
};

const normalizeList = data => {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.items || [];
};

const tierLabel = tier => tier?.name || tier?.id || '';

const EntryOwnedTiersEditor = ({ id }) => {
  const callout = useContext(CalloutContext);
  const intl = useIntl();
  const stripes = useStripes();
  const ky = useOkapiKy();
  const queryClient = useQueryClient();
  const [editingTier, setEditingTier] = useState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingTierId, setDeletingTierId] = useState();

  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  const isConsortium = entryQuery.data?.type === 'Consortium';

  const tiersQuery = useOkapiQuery(entryTiersPath(id), {
    staleTime: 2 * 60 * 1000,
    enabled: !!id && isConsortium,
  });

  const tiers = useMemo(() => normalizeList(tiersQuery.data), [tiersQuery.data]);

  const invalidateTierQueries = async tierId => {
    await queryClient.invalidateQueries(entryTiersPath(id));
    await queryClient.invalidateQueries(tiersPath);
    await queryClient.invalidateQueries([tiersPath]);
    await queryClient.invalidateQueries(entryPath(id));
    await queryClient.invalidateQueries(['directory/entries']);

    if (tierId) {
      await queryClient.invalidateQueries(tierPath(tierId));
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
    mutationFn: values => ky.post(tiersPath, {
      json: {
        name: values.name,
        consortium: id,
        level: values.level,
        type: values.type,
        cost: values.cost,
      },
    }),
    onSuccess: async () => {
      await invalidateTierQueries();
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.tier.create.success" />,
      });
    },
    onError: error => sendErrorCallout('ui-rsdir.tier.create.error', error),
  });

  const updater = useMutation({
    mutationFn: ({ tierId, modifiedFields }) => ky.patch(tierPath(tierId), { json: modifiedFields }),
    onSuccess: async (_data, variables) => {
      await invalidateTierQueries(variables.tierId);
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.tier.edit.success" />,
      });
    },
    onError: error => sendErrorCallout('ui-rsdir.tier.edit.error', error),
  });

  const deleter = useMutation({
    mutationFn: tierId => ky.delete(tierPath(tierId)),
    onMutate: tierId => {
      setDeletingTierId(tierId);
    },
    onSuccess: async (_data, tierId) => {
      if (editingTier?.id === tierId) {
        setEditingTier();
      }

      await invalidateTierQueries(tierId);
      callout.sendCallout({
        type: 'success',
        message: <FormattedMessage id="ui-rsdir.tier.delete.success" />,
      });
    },
    onError: error => sendErrorCallout('ui-rsdir.tier.delete.error', error),
    onSettled: () => {
      setDeletingTierId();
    },
  });

  const submit = (values, form) => {
    if (!editingTier) {
      return creator.mutateAsync(values).then(() => {
        form.restart(defaultTierValues);
        setIsModalOpen(false);
      });
    }

    const dirtyFields = form.getState().dirtyFields;
    const modifiedFields = {};

    ['name', 'level', 'type', 'cost'].forEach(fieldName => {
      if (dirtyFields[fieldName]) {
        modifiedFields[fieldName] = values[fieldName];
      }
    });

    return updater.mutateAsync({
      tierId: editingTier.id,
      modifiedFields,
    }).then(() => {
      setEditingTier();
      setIsModalOpen(false);
    });
  };

  const openCreateModal = () => {
    setEditingTier();
    setIsModalOpen(true);
  };

  const openEditModal = tier => {
    setEditingTier(tier);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingTier();
    setIsModalOpen(false);
  };

  const columns = [
    { key: 'name', label: intl.formatMessage({ id: 'ui-rsdir.tiers.current' }), render: tierLabel, sort: true },
    { key: 'level', label: intl.formatMessage({ id: 'ui-rsdir.tier.level' }), fit: true },
    { key: 'type', label: intl.formatMessage({ id: 'ui-rsdir.tier.type' }), fit: true },
    {
      key: 'cost',
      label: intl.formatMessage({ id: 'ui-rsdir.tier.cost' }),
      fit: true,
      render: tier => (Number.isFinite(tier.cost)
        ? intl.formatNumber(tier.cost, { style: 'currency', currency: stripes.currency })
        : ''),
      // Not the default comparator: it collates as text, which puts 1.5 before 1.25.
      sort: (a, b) => (a.cost ?? 0) - (b.cost ?? 0),
    },
    {
      key: 'actions',
      label: '',
      fit: true,
      render: tier => (
        <>
          <IconButton
            aria-label={intl.formatMessage({ id: 'ui-rsdir.tier.edit.action' }, { name: tierLabel(tier) })}
            icon="edit"
            id={`clickable-edit-tier-${tier.id}`}
            onClick={() => openEditModal(tier)}
          />
          <IconButton
            aria-label={intl.formatMessage({ id: 'ui-rsdir.tiers.delete.action' }, { name: tierLabel(tier) })}
            disabled={deleter.isLoading && deletingTierId === tier.id}
            icon="trash"
            id={`clickable-delete-tier-${tier.id}`}
            onClick={() => deleter.mutate(tier.id)}
          />
        </>
      ),
    },
  ];

  if (!entryQuery.isSuccess) {
    return null;
  }

  if (!isConsortium) {
    return (
      <KeyValue
        label={<FormattedMessage id="ui-rsdir.tiers.invalidEntryType.label" />}
        value={<FormattedMessage id="ui-rsdir.tiers.invalidEntryType" />}
      />
    );
  }

  if (!tiersQuery.isSuccess) {
    return null;
  }

  return (
    <div>
      <Row end="xs">
        <Col xs={12}>
          <Button
            buttonStyle="primary"
            id="clickable-add-entry-owned-tier"
            onClick={openCreateModal}
          >
            <FormattedMessage id="ui-rsdir.add" />
          </Button>
        </Col>
      </Row>
      {isModalOpen && (
        <Form
          key={editingTier?.id || 'create'}
          onSubmit={submit}
          initialValues={editingTier ? { ...defaultTierValues, ...editingTier } : defaultTierValues}
          keepDirtyOnReinitialize
        >
          {({ dirty, handleSubmit, pristine, submitting, invalid }) => (
            <Modal
              dismissible
              id="entry-owned-tier-modal"
              label={
                editingTier
                  ? <FormattedMessage id="ui-rsdir.tier.edit" values={{ name: tierLabel(editingTier) }} />
                  : <FormattedMessage id="ui-rsdir.tier.create" />
              }
              onClose={closeModal}
              open
            >
              <form onSubmit={handleSubmit} id="form-entry-owned-tier">
                <TierForm />
                <FormattedMessage id="ui-rsdir.confirmDirtyNavigate">
                  {prompt => <Prompt when={dirty && !submitting} message={prompt[0]} />}
                </FormattedMessage>
                <ModalFooter>
                  <Button
                    buttonStyle="primary"
                    disabled={pristine || submitting || invalid}
                    id="clickable-save-entry-owned-tier"
                    onClick={handleSubmit}
                    type="submit"
                  >
                    <FormattedMessage id={editingTier ? 'ui-rsdir.edit.submit' : 'ui-rsdir.create'} />
                  </Button>
                  <Button
                    buttonStyle="default"
                    id="clickable-cancel-entry-owned-tier"
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
        id="entry-owned-tiers-list"
        defaultSortColumn="name"
        caption={intl.formatMessage({ id: 'ui-rsdir.entry.section.tiers' })}
        columns={columns}
        rows={tiers}
        emptyMessage={intl.formatMessage({ id: 'ui-rsdir.tiers.empty' })}
        loading={tiersQuery.isFetching}
      />
    </div>
  );
};

export default EntryOwnedTiersEditor;
