import React from 'react';
import { injectIntl } from 'react-intl';
import { actionMeta } from '../actionMeta';
import ActionButton from '../ActionButton';

const Generic = props => {
  const { name:action, actions, intl } = props;
  const withNote = actions?.find(a => a.name === action)?.parameters?.includes('note');
  const icon = actionMeta[action]?.icon;
  const successKey = `stripes-reshare.actions.${action}.success`;
  const errorKey = `stripes-reshare.actions.${action}.error`;
  if (successKey in intl.messages && errorKey in intl.messages) {
    return <ActionButton
      action={action}
      label={`stripes-reshare.actions.${action}`}
      icon={icon}
      withNote={withNote}
      success={successKey}
      error={errorKey}
      {...props}
    />;
  }
  return <ActionButton
    action={action}
    label={`stripes-reshare.actions.${action}`}
    icon={icon}
    withNote={withNote}
    {...props}
  />;
};

export default injectIntl(Generic);
