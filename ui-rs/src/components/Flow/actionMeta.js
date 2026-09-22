// Per-action client-side display metadata not provided by the API.
//
// `hidden` keeps an action out of the secondary "More options" list
// e.g. for when the UI surfaces them elsewhere
const actionMeta = {
  'ship': { icon: 'archive', primaryOnly: true },
  'supply-document': { icon: 'link', primaryOnly: true },
  'ship-return': { icon: 'archive' },
  'cannot-supply': { icon: 'times-circle-solid' },
  'reject-cancel': { icon: 'times-circle-solid' },
  'reject-condition': { icon: 'times-circle-solid' },
  'cancel-request': { icon: 'times-circle-solid' },
  'accept-cancel': { icon: 'check-circle' },
  'accept-condition': { icon: 'check-circle' },
  'will-supply': { icon: 'check-circle' },
  'add-condition': { icon: 'plus-sign' },
  'add-item': { icon: 'plus-sign' },
  'remove-item': { icon: 'trash', hidden: true },
  'pullslip-printed': { icon: 'print' },
  'ask-retry': { icon: 'edit' },
  'recall': { icon: 'flag' },
  'overdue': { icon: 'clock' },
  'renew': { icon: 'replace' },
  'accept-renewal': { icon: 'check-circle', primaryOnly: true },
  'reject-renewal': { icon: 'times-circle-solid' },
};

export default actionMeta;
