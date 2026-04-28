import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Accordion, MultiColumnList } from '@folio/stripes/components';
import { useNotificationList } from '../../chat/useNotifications';
import { formatConditionCode, formatConditionCost, formatConditionNote } from '../../../util/formatCondition';

const LoanConditions = (props) => {
  const { formatDate, formatMessage } = useIntl();
  const { request } = props;
  const { data } = useNotificationList(request?.id);

  const conditions = (data?.items || [])
    .filter(n => n.kind === 'condition')
    .slice()
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : a.createdAt < b.createdAt ? 1 : 0));

  if (conditions.length === 0) return null;

  const formatter = {
    condition: n => formatConditionCode(n, formatMessage),
    cost: n => formatConditionCost(n),
    note: n => formatConditionNote(n),
    createdAt: n => (n.createdAt ? formatDate(n.createdAt) : ''),
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
        }}
        contentData={conditions}
        formatter={formatter}
        visibleColumns={['condition', 'cost', 'createdAt', 'note']}
      />
    </Accordion>
  );
};

export default LoanConditions;
