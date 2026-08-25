import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Accordion, Button, ConfirmationModal, Icon, Layout, MultiColumnList, NoValue } from '@folio/stripes/components';
import { useIsActionPending, usePerformAction } from '@projectreshare/stripes-reshare';

import actionMeta from '../actionMeta';

// A blank header and a lone icon give MCL little to measure, so floor the column.
// No max, deliberately: MCL then stretches the last column over the row's slack,
// which is what carries the right-aligned button out to the trailing edge.
const COLUMN_WIDTHS = { remove: { min: 60 } };

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

  const formatter = {
    callNumber: item => item.callNumber || <NoValue />,
    title: item => item.title || <NoValue />,
    remove: item => (
      <Layout className="full flex justify-end">
        <Button
          buttonStyle="slim"
          marginBottom0
          disabled={actionPending}
          aria-label={intl.formatMessage({ id: 'ui-rs.flow.volumes.remove.ariaLabel' }, { barcode: item.barcode })}
          onClick={() => setPendingRemoval(item)}
        >
          <Icon icon={actionMeta['remove-item']?.icon} />
        </Button>
      </Layout>
    ),
  };

  // A lone item takes its title from the request when the lender doesn't supply
  // one, so the column only earns its place once there is more than one.
  const visibleColumns = [
    'barcode',
    'callNumber',
    ...(items.length > 1 ? ['title'] : []),
    ...(canRemove ? ['remove'] : []),
  ];

  return (
    <Accordion
      id="volumes"
      label={<FormattedMessage id="ui-rs.flow.sections.volumes" />}
    >
      <MultiColumnList
        columnMapping={{
          barcode: <FormattedMessage id="ui-rs.flow.volumes.itemBarcode" />,
          callNumber: <FormattedMessage id="ui-rs.flow.volumes.callNumber" />,
          title: <FormattedMessage id="ui-rs.flow.volumes.title" />,
          remove: '',
        }}
        columnWidths={COLUMN_WIDTHS}
        contentData={items}
        formatter={formatter}
        visibleColumns={visibleColumns}
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
