export const formatConditionNote = (notification) => {
  const { note } = notification;

  if ((note != null) && note.startsWith('#ReShareAddLoanCondition#')) {
    return note.replace(/^#ReShareAddLoanCondition# ?/, '');
  } else {
    return note;
  }
};

export const formatConditionCode = (notification, formatMessage) => {
  const code = notification.condition;
  if (!code) return '';
  return formatMessage({
    id: `ui-rs.settings.customiseListSelect.loanConditions.${code.toLowerCase()}`,
    defaultMessage: code,
  });
};

export const formatConditionCost = (notification) => {
  if (notification.cost == null) return '';
  return notification.currency ? `${notification.cost} ${notification.currency}` : `${notification.cost}`;
};

// There is no agreed-cost field on a request. A supplier quotes a price by
// attaching a cost to a condition, and the requester accepts or rejects each one
// independently, so the figure in force is the most recently accepted condition
// carrying a cost. Conditions from earlier suppliers in the rota do not count.
export const findAgreedCost = (notifications, supplierSymbol) => (notifications ?? [])
  .filter(n => n.kind === 'condition'
    && n.fromSymbol === supplierSymbol
    && n.receipt === 'ACCEPTED'
    && n.cost != null)
  .sort((a, b) => (a.createdAt > b.createdAt ? -1 : a.createdAt < b.createdAt ? 1 : 0))[0];
