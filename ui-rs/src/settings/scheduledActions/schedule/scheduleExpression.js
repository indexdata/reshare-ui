// Converts between the form's weekly/hourly/minutely shapes and broker RRULEs.
// A single RRULE fires on the cross-product of its BY* lists, so a weekly rule
// cannot bind distinct minutes to its hours; one minute applies to every hour.
// `days` is an array of 0-based day-of-week numbers (Sun=0 .. Sat=6) — the same
// numbering JS Date.getDay() uses. `hours` remains raw form text ("9, 15").

// Display order for the week, Monday-first.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const byWeekOrder = (a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b);

// RRULE BYDAY codes indexed by 0-based day-of-week (Sun=0 .. Sat=6).
const DOW_TO_RRULE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const RRULE_TO_DOW = Object.fromEntries(DOW_TO_RRULE.map((code, dow) => [code, dow]));

// 2023-01-01 was a Sunday, giving Intl a stable reference week.
const dowRefDate = (dow) => new Date(Date.UTC(2023, 0, 1 + dow));
export const dayName = (intl, dow, weekday = 'short') => intl.formatDate(
  dowRefDate(dow),
  { weekday, timeZone: 'UTC' },
);

const parseHourList = (hours) => [...new Set(
  String(hours)
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(h => Number.isInteger(h) && h >= 0 && h <= 23)
)].sort((a, b) => a - b);

const toMinute = (m) => {
  const n = parseInt(m, 10);
  return Number.isInteger(n) && n >= 0 && n <= 59 ? n : 0;
};

const toInterval = (v) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n >= 1 ? n : 1;
};

export const isHourListValid = (hours) => {
  const tokens = String(hours).split(',').map(t => t.trim());
  if (!tokens.length || tokens.some(t => t === '')) return false;
  return tokens.every(t => /^\d+$/.test(t) && Number(t) <= 23);
};

export const isMinuteValid = (minute) => {
  const s = String(minute).trim();
  if (s === '') return true;
  return /^\d+$/.test(s) && Number(s) <= 59;
};

export const isIntervalValid = (interval) => {
  const s = String(interval).trim();
  return /^\d+$/.test(s) && Number(s) >= 1;
};

// BYSECOND is temporarily tolerated for broker templates generated before the
// scheduler's midnight DTSTART anchor.
const SUPPORTED_KEYS = new Set(['FREQ', 'INTERVAL', 'BYDAY', 'BYHOUR', 'BYMINUTE', 'BYSECOND']);

const intInRange = (token, max) => {
  const s = String(token).trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n <= max ? n : null;
};

const positiveInt = (token) => {
  const s = String(token).trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 ? n : null;
};

// The form cannot represent a BYMINUTE list; an absent value defaults to zero.
const parseByMinute = (rule) => {
  if (rule.BYMINUTE === undefined) return 0;
  if (rule.BYMINUTE.includes(',')) return null;
  return intInRange(rule.BYMINUTE, 59);
};

// Accept only shapes the form can faithfully round-trip:
// - WEEKLY with BYDAY and BYHOUR
// - DAILY with BYHOUR, mapped to weekly with all days selected
// - HOURLY with an optional single BYMINUTE
// - MINUTELY with a positive INTERVAL
// Unknown components and combinations are unsupported.
const parseExpression = (expression) => {
  if (typeof expression !== 'string') return null;
  const parts = expression.trim().split(';').filter(Boolean);
  if (!parts.length) return null;

  const rule = {};
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) return null;
    const key = part.slice(0, eq).toUpperCase();
    if (!SUPPORTED_KEYS.has(key) || key in rule) return null;
    rule[key] = part.slice(eq + 1).trim();
  }

  const freq = rule.FREQ?.toUpperCase();

  if (freq === 'MINUTELY') {
    if ('BYDAY' in rule || 'BYHOUR' in rule || 'BYMINUTE' in rule) return null;
    const interval = positiveInt(rule.INTERVAL);
    if (interval === null) return null;
    return { frequency: 'minutely', days: [], hours: [], minute: 0, interval };
  }
  if ('INTERVAL' in rule) return null;

  if (freq === 'HOURLY') {
    if ('BYDAY' in rule || 'BYHOUR' in rule) return null;
    const minute = parseByMinute(rule);
    if (minute === null) return null;
    return { frequency: 'hourly', days: [], hours: [], minute, interval: '' };
  }

  if (freq !== 'WEEKLY' && freq !== 'DAILY') return null;
  if (!rule.BYHOUR) return null;
  if (freq === 'WEEKLY' && !rule.BYDAY) return null;
  if (freq === 'DAILY' && 'BYDAY' in rule) return null;

  const days = [];
  if (freq === 'DAILY') {
    days.push(...WEEK_ORDER);
  } else {
    for (const code of rule.BYDAY.split(',')) {
      const dow = RRULE_TO_DOW[code.trim().toUpperCase()];
      if (!Number.isInteger(dow)) return null;
      days.push(dow);
    }
  }

  const hours = [];
  for (const token of rule.BYHOUR.split(',')) {
    const h = intInRange(token, 23);
    if (h === null) return null;
    hours.push(h);
  }

  const minute = parseByMinute(rule);
  if (minute === null) return null;

  return {
    frequency: 'weekly',
    days: [...new Set(days)].sort(byWeekOrder),
    hours: [...new Set(hours)].sort((a, b) => a - b),
    minute,
    interval: '',
  };
};

const isEveryDay = (dows) => dows.length === 7;

// { frequency: 'weekly', days: [1, 3], hours: '6, 13', minute: 30 }
//   -> 'FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=6,13;BYMINUTE=30'
// All seven days -> 'FREQ=DAILY;BYHOUR=…;BYMINUTE=…'.
// { frequency: 'hourly', minute: 0 } -> 'FREQ=HOURLY;BYMINUTE=0'.
// { frequency: 'minutely', interval: 15 } -> 'FREQ=MINUTELY;INTERVAL=15'.
export function scheduleToExpression({
  frequency = 'weekly', days = [], hours = '', minute = 0, interval,
} = {}) {
  if (frequency === 'minutely') {
    return `FREQ=MINUTELY;INTERVAL=${toInterval(interval)}`;
  }
  if (frequency === 'hourly') {
    return `FREQ=HOURLY;BYMINUTE=${toMinute(minute)}`;
  }

  const hourList = parseHourList(hours);
  const dows = [...new Set(days)]
    .filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);

  const parts = isEveryDay(dows) ? ['FREQ=DAILY'] : ['FREQ=WEEKLY'];
  if (!isEveryDay(dows) && dows.length) parts.push(`BYDAY=${dows.map(d => DOW_TO_RRULE[d]).join(',')}`);
  if (hourList.length) parts.push(`BYHOUR=${hourList.join(',')}`);
  parts.push(`BYMINUTE=${toMinute(minute)}`);
  return parts.join(';');
}

// 'FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=6,13;BYMINUTE=30'
//   -> { frequency: 'weekly', days: [1, 3], hours: '6, 13', minute: 30, interval: '' }
// Returns null if the expression isn't a schedule the form can represent.
export function scheduleFromExpression(expression) {
  const parsed = parseExpression(expression);
  if (!parsed) return null;
  return {
    frequency: parsed.frequency,
    days: parsed.days,
    hours: parsed.hours.join(', '),
    minute: parsed.minute,
    interval: parsed.interval,
  };
}

// Edit warns before replacing schedules the form cannot represent.
export const isScheduleSupported = (expression) => parseExpression(expression) !== null;

// Unsupported expressions display as their raw RRULE.
export function describeSchedule(expression, intl) {
  const parsed = parseExpression(expression);
  if (!parsed) return expression || '';

  if (parsed.frequency === 'minutely') {
    return intl.formatMessage(
      { id: 'ui-rs.settings.scheduledActions.scheduleSummaryMinutely' },
      { interval: parsed.interval },
    );
  }

  const mm = String(parsed.minute).padStart(2, '0');
  if (parsed.frequency === 'hourly') {
    return intl.formatMessage(
      { id: 'ui-rs.settings.scheduledActions.scheduleSummaryHourly' },
      { minute: mm },
    );
  }

  const times = intl.formatList(
    parsed.hours.map(h => `${String(h).padStart(2, '0')}:${mm}`),
    { type: 'unit' },
  );
  if (isEveryDay(parsed.days)) {
    return intl.formatMessage(
      { id: 'ui-rs.settings.scheduledActions.scheduleSummaryDaily' },
      { times },
    );
  }
  const days = intl.formatList(parsed.days.map(d => dayName(intl, d)), { type: 'unit' });
  return intl.formatMessage(
    { id: 'ui-rs.settings.scheduledActions.scheduleSummary' },
    { days, times },
  );
}
