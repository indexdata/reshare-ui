// Restrict lookup by side: borrowing and lending records can share a requester request ID.
const scanActions = [
  { action: 'add-item', side: 'lending', promptItem: true },
  { action: 'ship', side: 'lending' },
  { action: 'receive', side: 'borrowing' },
  { action: 'check-in', side: 'borrowing' },
  { action: 'ship-return', side: 'borrowing' },
  { action: 'mark-received', side: 'lending' },
];

export const scanActionsByName = Object.fromEntries(scanActions.map(a => [a.action, a]));

export default scanActions;
