import React from 'react';
import { useIntl } from 'react-intl';
import { Button, Label } from '@folio/stripes/components';
import { WEEK_ORDER, dayName } from '../scheduleExpression';
import css from './DaysOfWeek.css';

// Final Form value is a Monday-first array using JS day numbers (Sun=0 .. Sat=6).
const DaysOfWeek = ({ id, label, required, input, meta }) => {
  const intl = useIntl();
  const { value = [], onChange, onBlur } = input;
  const selected = new Set(value);

  const toggle = (dow) => {
    const next = new Set(selected);
    if (next.has(dow)) next.delete(dow); else next.add(dow);
    // Rebuild from WEEK_ORDER so toggling never changes value ordering.
    onChange(WEEK_ORDER.filter((d) => next.has(d)));
    // Surface the required-day error after the group has been used.
    onBlur?.();
  };

  const labelId = label ? `${id}-label` : undefined;
  const error = meta?.touched && meta?.error;

  return (
    <div className={css.field}>
      {label && <Label tagName="span" id={labelId} required={required}>{label}</Label>}
      <div
        className={css.days}
        id={id}
        role="group"
        aria-labelledby={labelId}
      >
        {WEEK_ORDER.map((dow) => (
          <Button
            key={dow}
            buttonStyle={selected.has(dow) ? 'primary' : 'default'}
            marginBottom0
            onClick={() => toggle(dow)}
            aria-pressed={selected.has(dow)}
            aria-label={dayName(intl, dow, 'long')}
          >
            {dayName(intl, dow, 'short')}
          </Button>
        ))}
      </div>
      {error && <div className={css.error} role="alert">{error}</div>}
    </div>
  );
};

export default DaysOfWeek;
