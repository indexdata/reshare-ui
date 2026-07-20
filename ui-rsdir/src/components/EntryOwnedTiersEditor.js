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
  Modal,
  MultiColumnList,
  Row,
} from '@folio/stripes/components';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import TierForm from './TierForm';

const entryPath = id => `rsdir/entries/by-id/${id}`;
const entryTiersPath = id => `rsdir/entries/by-id/${id}/tiers`;
const tiersPath = 'rsdir/tiers';
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
    await queryClient.invalidateQueries(['rsdir/entries']);

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

  const formatter = {
    name: tier => tierLabel(tier),
    level: tier => tier.level,
    type: tier => tier.type,
    cost: tier => tier.cost,
    actions: tier => (
      <>
        <IconButton
          aria-label={intl.formatMessage({ id: 'ui-rsdir.tier.edit.action' })}
          icon="edit"
          id={`clickable-edit-tier-${tier.id}`}
          onClick={event => {
            event.stopPropagation();
            openEditModal(tier);
          }}
        />
        <IconButton
          aria-label={intl.formatMessage({ id: 'ui-rsdir.tiers.delete' })}
          disabled={deleter.isLoading && deletingTierId === tier.id}
          icon="trash"
          id={`clickable-delete-tier-${tier.id}`}
          onClick={event => {
            event.stopPropagation();
            deleter.mutate(tier.id);
          }}
        />
      </>
    ),
  };

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
              footer={(
                <>
                  <Button
                    buttonStyle="default"
                    id="clickable-cancel-entry-owned-tier"
                    marginBottom0
                    onClick={closeModal}
                  >
                    <FormattedMessage id="ui-rsdir.cancel" />
                  </Button>
                  <Button
                    buttonStyle="primary"
                    disabled={pristine || submitting || invalid}
                    id="clickable-save-entry-owned-tier"
                    marginBottom0
                    onClick={handleSubmit}
                    type="submit"
                  >
                    <FormattedMessage id={editingTier ? 'ui-rsdir.edit.submit' : 'ui-rsdir.create'} />
                  </Button>
                </>
              )}
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
              </form>
            </Modal>
          )}
        </Form>
      )}
      <MultiColumnList
        contentData={tiers}
        formatter={formatter}
        id="entry-owned-tiers-list"
        isEmptyMessage={intl.formatMessage({ id: 'ui-rsdir.tiers.empty' })}
        loading={tiersQuery.isFetching}
        onRowClick={(_event, tier) => openEditModal(tier)}
        visibleColumns={['name', 'level', 'type', 'cost', 'actions']}
        columnMapping={{
          name: intl.formatMessage({ id: 'ui-rsdir.tiers.current' }),
          level: intl.formatMessage({ id: 'ui-rsdir.tier.level' }),
          type: intl.formatMessage({ id: 'ui-rsdir.tier.type' }),
          cost: intl.formatMessage({ id: 'ui-rsdir.tier.cost' }),
          actions: '',
        }}
      />
    </div>
  );
};

export default EntryOwnedTiersEditor;
