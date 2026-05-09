import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Accordion, MultiColumnList } from '@folio/stripes/components';
import { useNotificationList } from '../../chat/useNotifications';
import { formatConditionCode, formatConditionCost, formatConditionNote } from '../../../util/formatCondition';

const conditionStatusId = (receipt) => {
  if (receipt === 'ACCEPTED') return 'ui-rs.flow.loanConditions.status.accepted';
  if (receipt === 'REJECTED') return 'ui-rs.flow.loanConditions.status.rejected';
  return 'ui-rs.flow.loanConditions.status.pending';
};

const LoanConditions = (props) => {
  const { formatDate, formatMessage } = useIntl();
  const { request } = props;
  const { data } = useNotificationList(request?.id);

  const conditions = (data?.items || [])
    .filter(n => n.kind === 'condition' && n.fromSymbol === request?.supplierSymbol)
    .slice()
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : a.createdAt < b.createdAt ? 1 : 0));

  if (conditions.length === 0) return null;

  const formatter = {
    condition: n => formatConditionCode(n, formatMessage),
    cost: n => formatConditionCost(n),
    note: n => formatConditionNote(n),
    createdAt: n => (n.createdAt ? formatDate(n.createdAt) : ''),
    status: n => <FormattedMessage id={conditionStatusId(n.receipt)} />,
  };

  return (
    <Accordion
      id="loanConditions"
      label={<FormattedMessage id="ui-rs.flow.sections.loanConditions" />}
    >
      <MultiColumnList
        columnMapping={{
          condition: <FormattedMessage id="ui-rs.flow.loanConditions.condition" />,
          cost: <FormattedMessage id="ui-rs.flow.loanConditions.cost" />,
          note: <FormattedMessage id="ui-rs.flow.loanConditions.note" />,
          createdAt: <FormattedMessage id="ui-rs.flow.loanConditions.dateReceived" />,
          status: <FormattedMessage id="ui-rs.flow.loanConditions.status" />,
        }}
        contentData={conditions}
        formatter={formatter}
        visibleColumns={['condition', 'cost', 'createdAt', 'status', 'note']}
      />
    </Accordion>
  );
};

export default LoanConditions;
