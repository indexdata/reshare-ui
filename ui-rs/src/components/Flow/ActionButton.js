import React, { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import classNames from 'classnames';
import { Button, Icon } from '@folio/stripes/components';
import { useIsActionPending } from '@projectreshare/stripes-reshare';
// eslint-disable-next-line import/no-extraneous-dependencies
import interCss from '@folio/stripes-components/lib/sharedStyles/interactionStyles.css';

import css from './ActionButton.css';
import NoteForm from '../NoteForm';

const DEFAULT_ICON = 'chevron-double-right';

const ActionButton = ({ action, disabled, performAction, request, payload = {}, success = null, error = null, icon = null, label, withNote = false }) => {
  const [noteFieldOpen, setNoteFieldOpen] = useState(false);
  // The actions were derived from the request as it was fetched, so they are
  // withdrawn while it is known to have moved on. Actions carrying their own
  // form disable their submit the same way.
  const actionPending = useIsActionPending(request?.id);
  const isDisabled = disabled || actionPending;
  const onSubmitNote = (note) => {
    performAction(action, { ...payload, note }, { success, error }).catch(() => {});
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Stop this event from firing if the notes form is shown.
    if (!noteFieldOpen) {
      performAction(action, payload, { success, error }).catch(() => {});
    }
    // else NOOP.
  };

  if (!noteFieldOpen) {
    return (
      <span className={`${css.actionWrapper} ${interCss.interactionStyles}`}>
        <Button
          buttonStyle="dropdownItem"
          onClick={handleClick}
          buttonClass={classNames({ [`${css.actionButton}`] : true, [`${css.withInlineForm}`]: withNote })}
          disabled={isDisabled}
        >
          <Icon icon={icon || DEFAULT_ICON} className={css.button}>
            <FormattedMessage id={label} />
          </Icon>
        </Button>
        { withNote && <NoteForm onSend={onSubmitNote} visibility={noteFieldOpen} setVisibility={setNoteFieldOpen} disabled={isDisabled} className={css.addNoteForm} /> }
      </span>
    );
  } else {
    // Form is open replace the button with a span.
    return (
      <span className={`${css.actionWrapper} ${interCss.interactionStyles}`}>
        <span className={css.inlineFormWrapper}>
          <Icon icon={icon || DEFAULT_ICON} className={css.button}>
            <FormattedMessage id={label} />
          </Icon>
        </span>
        <NoteForm onSend={onSubmitNote} visibility={noteFieldOpen} setVisibility={setNoteFieldOpen} disabled={isDisabled} className={css.addNoteForm} />
      </span>
    );
  }
};

export default ActionButton;
