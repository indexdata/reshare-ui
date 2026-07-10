import { createIntl } from 'react-intl';
import {
  scheduleToExpression,
  scheduleFromExpression,
  describeSchedule,
  isScheduleSupported,
  isHourListValid,
  isMinuteValid,
  isIntervalValid,
  WEEK_ORDER,
} from './scheduleExpression';

const intl = createIntl({
  locale: 'en',
  messages: {
    'ui-rs.settings.scheduledActions.scheduleSummary': '{days} at {times}',
    'ui-rs.settings.scheduledActions.scheduleSummaryDaily': 'Every day at {times}',
    'ui-rs.settings.scheduledActions.scheduleSummaryHourly': 'Hourly at :{minute}',
    'ui-rs.settings.scheduledActions.scheduleSummaryMinutely': 'Every {interval} minutes',
  },
});

describe('scheduleExpression', () => {
  describe('scheduleToExpression', () => {
    it('builds a weekly RRULE from days, hours and a shared minute', () => {
      expect(scheduleToExpression({
        days: [1, 2, 3, 4, 5],
        hours: '6, 13',
        minute: 30,
      })).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=6,13;BYMINUTE=30');
    });

    it('defaults a blank/invalid minute to 0', () => {
      expect(scheduleToExpression({ days: [1], hours: '6', minute: '' }))
        .toBe('FREQ=WEEKLY;BYDAY=MO;BYHOUR=6;BYMINUTE=0');
    });

    it('maps Sunday to SU, sorts and dedupes hours', () => {
      expect(scheduleToExpression({ days: [0, 1], hours: '9, 9, 6', minute: 0 }))
        .toBe('FREQ=WEEKLY;BYDAY=SU,MO;BYHOUR=6,9;BYMINUTE=0');
    });

    it('omits BYDAY/BYHOUR when empty', () => {
      expect(scheduleToExpression({ days: [], hours: '', minute: 0 })).toBe('FREQ=WEEKLY;BYMINUTE=0');
    });

    it('encodes all seven days as FREQ=DAILY without BYDAY', () => {
      expect(scheduleToExpression({ frequency: 'weekly', days: WEEK_ORDER, hours: '5', minute: 0 }))
        .toBe('FREQ=DAILY;BYHOUR=5;BYMINUTE=0');
    });

    it('builds an hourly rule from a shared minute', () => {
      expect(scheduleToExpression({ frequency: 'hourly', minute: 30 }))
        .toBe('FREQ=HOURLY;BYMINUTE=30');
      expect(scheduleToExpression({ frequency: 'hourly', minute: '' }))
        .toBe('FREQ=HOURLY;BYMINUTE=0');
    });

    it('builds a minutely rule from an interval', () => {
      expect(scheduleToExpression({ frequency: 'minutely', interval: 15 }))
        .toBe('FREQ=MINUTELY;INTERVAL=15');
      expect(scheduleToExpression({ frequency: 'minutely', interval: '' }))
        .toBe('FREQ=MINUTELY;INTERVAL=1');
    });
  });

  describe('scheduleFromExpression', () => {
    it('parses a weekly RRULE back into days, an hours string and minute', () => {
      expect(scheduleFromExpression('FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=6,13;BYMINUTE=30')).toEqual({
        frequency: 'weekly',
        days: [1, 3],
        hours: '6, 13',
        minute: 30,
        interval: '',
      });
    });

    it('parses FREQ=DAILY into weekly with all seven days', () => {
      expect(scheduleFromExpression('FREQ=DAILY;BYHOUR=5;BYMINUTE=0')).toEqual({
        frequency: 'weekly',
        days: WEEK_ORDER,
        hours: '5',
        minute: 0,
        interval: '',
      });
    });

    it('parses an hourly RRULE into the shared minute', () => {
      expect(scheduleFromExpression('FREQ=HOURLY;BYMINUTE=15')).toEqual({
        frequency: 'hourly',
        days: [],
        hours: '',
        minute: 15,
        interval: '',
      });
      expect(scheduleFromExpression('FREQ=HOURLY').minute).toBe(0);
    });

    it('parses a minutely RRULE into an interval', () => {
      expect(scheduleFromExpression('FREQ=MINUTELY;INTERVAL=15')).toEqual({
        frequency: 'minutely',
        days: [],
        hours: '',
        minute: 0,
        interval: 15,
      });
    });

    it('defaults minute to 0 when BYMINUTE is absent', () => {
      expect(scheduleFromExpression('FREQ=WEEKLY;BYDAY=MO;BYHOUR=6').minute).toBe(0);
    });

    it('orders parsed days Monday-first', () => {
      expect(scheduleFromExpression('FREQ=WEEKLY;BYDAY=SU,MO;BYHOUR=6').days).toEqual([1, 0]);
    });

    it('returns null when the string is not an RRULE we recognize', () => {
      expect(scheduleFromExpression('nonsense')).toBeNull();
      expect(scheduleFromExpression('BYDAY=MO')).toBeNull();
      expect(scheduleFromExpression('')).toBeNull();
    });

    it('rejects schedules the form cannot generate', () => {
      expect(scheduleFromExpression('FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=6')).toBeNull();
      expect(scheduleFromExpression('FREQ=WEEKLY;BYHOUR=6')).toBeNull();
      expect(scheduleFromExpression('FREQ=WEEKLY;BYDAY=MO')).toBeNull();
      expect(scheduleFromExpression('FREQ=WEEKLY;BYDAY=2MO;BYHOUR=6')).toBeNull();
      expect(scheduleFromExpression('FREQ=WEEKLY;BYDAY=MO;BYHOUR=24')).toBeNull();
      expect(scheduleFromExpression('FREQ=WEEKLY;BYDAY=MO;BYHOUR=6,x')).toBeNull();
      expect(scheduleFromExpression('FREQ=WEEKLY;BYDAY=MO;BYHOUR=6;BYMINUTE=15,45')).toBeNull();
      expect(scheduleFromExpression('FREQ=WEEKLY;BYDAY=MO;BYHOUR=6;INTERVAL=2')).toBeNull();
      expect(scheduleFromExpression('FREQ=DAILY')).toBeNull();
      expect(scheduleFromExpression('FREQ=DAILY;BYDAY=MO;BYHOUR=6')).toBeNull();
      expect(scheduleFromExpression('FREQ=MINUTELY')).toBeNull();
      expect(scheduleFromExpression('FREQ=MINUTELY;INTERVAL=0')).toBeNull();
      expect(scheduleFromExpression('FREQ=MINUTELY;INTERVAL=15;BYHOUR=6')).toBeNull();
    });
  });

  describe('isScheduleSupported', () => {
    it('is true for a form-generated expression and false otherwise', () => {
      expect(isScheduleSupported('FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=6;BYMINUTE=0')).toBe(true);
      expect(isScheduleSupported('FREQ=DAILY;BYHOUR=5;BYMINUTE=0')).toBe(true);
      expect(isScheduleSupported('FREQ=HOURLY;BYMINUTE=0')).toBe(true);
      expect(isScheduleSupported('FREQ=MINUTELY;INTERVAL=15')).toBe(true);
      expect(isScheduleSupported('FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=6')).toBe(false);
      expect(isScheduleSupported('')).toBe(false);
    });
  });

  it('round-trips days, hours and minute through RRULE', () => {
    const input = { frequency: 'weekly', days: [1, 3, 0], hours: '6, 18', minute: 15 };
    const back = scheduleFromExpression(scheduleToExpression(input));
    expect(back.days.sort()).toEqual([0, 1, 3]);
    expect(back.hours).toBe('6, 18');
    expect(back.minute).toBe(15);
  });

  it('round-trips all-seven-days (daily) stably', () => {
    const expr = scheduleToExpression({ frequency: 'weekly', days: WEEK_ORDER, hours: '5', minute: 0 });
    expect(expr).toBe('FREQ=DAILY;BYHOUR=5;BYMINUTE=0');
    const back = scheduleFromExpression(expr);
    expect(back.days.sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(scheduleToExpression(back)).toBe(expr);
  });

  it('round-trips hourly and minutely', () => {
    const hourly = scheduleToExpression({ frequency: 'hourly', minute: 30 });
    expect(scheduleToExpression(scheduleFromExpression(hourly))).toBe(hourly);
    const minutely = scheduleToExpression({ frequency: 'minutely', interval: 15 });
    expect(scheduleToExpression(scheduleFromExpression(minutely))).toBe(minutely);
  });

  describe('describeSchedule', () => {
    it('renders a localized summary including the shared minute', () => {
      expect(describeSchedule('FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=6,13;BYMINUTE=30', intl))
        .toBe('Mon, Wed at 06:30, 13:30');
    });

    it('summarizes daily, hourly and minutely rules', () => {
      expect(describeSchedule('FREQ=DAILY;BYHOUR=5;BYMINUTE=0', intl)).toBe('Every day at 05:00');
      expect(describeSchedule('FREQ=HOURLY;BYMINUTE=0', intl)).toBe('Hourly at :00');
      expect(describeSchedule('FREQ=MINUTELY;INTERVAL=15', intl)).toBe('Every 15 minutes');
    });

    it('falls back to the raw string without a day or hour', () => {
      expect(describeSchedule('FREQ=WEEKLY;BYMINUTE=0', intl)).toBe('FREQ=WEEKLY;BYMINUTE=0');
      expect(describeSchedule('not-a-rrule', intl)).toBe('not-a-rrule');
    });
  });

  describe('validators', () => {
    it('accepts comma/space-delimited hours in 0-23 and rejects others', () => {
      expect(isHourListValid('9, 15')).toBe(true);
      expect(isHourListValid('0,23')).toBe(true);
      expect(isHourListValid('')).toBe(false);
      expect(isHourListValid('9,')).toBe(false);
      expect(isHourListValid('24')).toBe(false);
      expect(isHourListValid('9, x')).toBe(false);
    });

    it('accepts a blank minute or 0-59 and rejects 60+', () => {
      expect(isMinuteValid('')).toBe(true);
      expect(isMinuteValid(0)).toBe(true);
      expect(isMinuteValid('59')).toBe(true);
      expect(isMinuteValid('60')).toBe(false);
      expect(isMinuteValid('x')).toBe(false);
    });

    it('accepts a positive whole-number interval and rejects others', () => {
      expect(isIntervalValid('15')).toBe(true);
      expect(isIntervalValid(1)).toBe(true);
      expect(isIntervalValid('0')).toBe(false);
      expect(isIntervalValid('')).toBe(false);
      expect(isIntervalValid('1.5')).toBe(false);
      expect(isIntervalValid('x')).toBe(false);
    });
  });
});
