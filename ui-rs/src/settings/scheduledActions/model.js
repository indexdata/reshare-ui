import { scheduleToExpression, scheduleFromExpression } from './schedule/scheduleExpression';

export function buildBatchActionBody(values = {}) {
  const { actionName, title, batchQuery, frequency, days, hours, minute, interval, actionParams } = values;
  return {
    actionName,
    title,
    batchQuery,
    schedule: scheduleToExpression({ frequency, days, hours, minute, interval }),
    actionParams: actionParams ?? {},
  };
}

// Unsupported schedules become an empty weekly form; Edit displays the warning.
export function recordToFormValues(record = {}) {
  const schedule = scheduleFromExpression(record.schedule)
    ?? { frequency: 'weekly', days: [], hours: '', minute: 0, interval: '' };
  return {
    actionName: record.actionName,
    title: record.title,
    batchQuery: record.batchQuery,
    frequency: schedule.frequency,
    days: schedule.days,
    hours: schedule.hours,
    minute: schedule.minute,
    interval: schedule.interval,
    actionParams: record.actionParams,
  };
}
