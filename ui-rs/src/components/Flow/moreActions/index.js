import React from 'react';
import { ReasonUnfilled } from '@projectreshare/stripes-reshare';
import ActionReasonButton from '../ActionReasonButton';

export { default as Generic } from './Generic';
export { default as AddCondition } from './AddCondition';
export { default as AddItem } from './AddItem';
export { default as AskRetry } from './AskRetry';
export { default as SupplyDocument } from './SupplyDocument';

export const CannotSupply = props => (
  <ActionReasonButton
    action="cannot-supply"
    reasons={ReasonUnfilled}
    reasonField="reasonUnfilled"
    reasonTranslationPrefix="stripes-reshare.iso18626.ReasonUnfilled"
    {...props}
  />
);
