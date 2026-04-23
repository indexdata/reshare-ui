import React from 'react';
import ActionReasonButton from '../ActionReasonButton';
import { ReasonUnfilled } from '../../../constants/iso18626';

export { default as Generic } from './Generic';
export { default as AddCondition } from './AddCondition';

export const CannotSupply = props => (
  <ActionReasonButton
    action="cannot-supply"
    reasons={ReasonUnfilled}
    reasonField="reasonUnfilled"
    reasonTranslationPrefix="ui-rs.iso18626.ReasonUnfilled"
    {...props}
  />
);
