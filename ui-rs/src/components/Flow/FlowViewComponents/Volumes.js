import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Accordion, Button, ConfirmationModal, Icon, NoValue } from '@folio/stripes/components';
import { SimpleTable, useIsActionPending, usePerformAction } from '@projectreshare/stripes-reshare';

import actionMeta from '../actionMeta';

// Items attached to a lending request, whether the LMS supplied them or a lender
// attached them by hand. Broker embeds them on the request, so nothing is fetched
// here. Removal is the remove-item action, which matches on barcode rather than id;
// actionMeta hides it from More options so it is offered only per row.
const Volumes = ({ request, actions = [] }) => {
  const intl = useIntl();
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const performAction = usePerformAction(request?.id);
  const actionPending = !!useIsActionPending(request?.id);

  const items = request?.items ?? [];
  const canRemove = actions.some(a => a.name === 'remove-item');

  if (items.length === 0) return null;

  // Closes either way: ConfirmationModal has nowhere to show a failure, so the
  // callout performAction raises is left to speak for itself.
  const onConfirm = async () => {
    const { barcode } = pendingRemoval;
    setPendingRemoval(null);
    try {
      await performAction('remove-item', { barcode });
    } catch (err) {
      // Already reported by performAction.
    }
  };

  const columns = [
    { key: 'barcode', label: <FormattedMessage id="ui-rs.flow.volumes.itemBarcode" /> },
    {
      key: 'callNumber',
      label: <FormattedMessage id="ui-rs.flow.volumes.callNumber" />,
      render: item => item.callNumber || <NoValue />,
    },
    {
      key: 'title',
      label: <FormattedMessage id="ui-rs.flow.volumes.title" />,
      render: item => item.title || <NoValue />,
    },
    {
      key: 'lmsStatus',
      label: <FormattedMessage id="ui-rs.flow.volumes.lmsStatus" />,
      // UNKNOWN is also where a skipped LMS operation (integration off, manual LMS)
      // leaves an item, so it reads as blank rather than as a fault.
      render: item => (item.lmsStatus && item.lmsStatus !== 'UNKNOWN'
        ? <FormattedMessage id={`ui-rs.flow.volumes.lmsStatus.${item.lmsStatus}`} />
        : <NoValue />),
    },
    ...(canRemove ? [{
      key: 'actions',
      label: '',
      fit: true,
      render: item => (
        <Button
          buttonStyle="slim"
          marginBottom0
          disabled={actionPending}
          aria-label={intl.formatMessage({ id: 'ui-rs.flow.volumes.remove.ariaLabel' }, { barcode: item.barcode })}
          onClick={() => setPendingRemoval(item)}
        >
          <Icon icon={actionMeta['remove-item']?.icon} />
        </Button>
      ),
    }] : []),
  ];

  return (
    <Accordion
      id="volumes"
      label={<FormattedMessage id="ui-rs.flow.sections.volumes" />}
    >
      <SimpleTable
        id="volumes-list"
        caption={intl.formatMessage({ id: 'ui-rs.flow.sections.volumes' })}
        columns={columns}
        rows={items}
      />
      <ConfirmationModal
        open={!!pendingRemoval}
        heading={<FormattedMessage id="ui-rs.flow.volumes.remove.heading" />}
        message={<FormattedMessage id="ui-rs.flow.volumes.remove.confirm" values={{ barcode: pendingRemoval?.barcode }} />}
        confirmLabel={<FormattedMessage id="ui-rs.flow.volumes.remove.confirmLabel" />}
        onConfirm={onConfirm}
        onCancel={() => setPendingRemoval(null)}
      />
    </Accordion>
  );
};

export default Volumes;
