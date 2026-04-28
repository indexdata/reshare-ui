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
