import React from 'react';
import ActionReasonButton from '../ActionReasonButton';

export { default as Generic } from './Generic';
export { default as AddCondition } from './AddCondition';
export { default as AddItem } from './AddItem';
export { default as AskRetry } from './AskRetry';
export { default as CancelRequest } from '../CancelRequest';
export { default as Recall } from './Recall';
export { default as Rerequest } from './Rerequest';
export { default as SupplyDocument } from './SupplyDocument';

export const CannotSupply = props => (
  <ActionReasonButton
    action="cannot-supply"
    reasonConfigField="unfilledReasons"
    reasonField="reasonUnfilled"
    {...props}
  />
);
