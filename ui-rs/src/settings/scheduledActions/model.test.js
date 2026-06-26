import { buildBatchActionBody, recordToFormValues } from './model';
import { scheduleToExpression, scheduleFromExpression } from './schedule/scheduleExpression';

// model.js only composes/decomposes the body around the schedule converter, so
// these assert the wiring (right fields in the right slots, passthrough,
// defaults) against the converter's own output rather than a literal RRULE —
// the wire format is the converter's contract to test, not the model's.
describe('scheduledActions model', () => {
  describe('buildBatchActionBody', () => {
    it('composes action type, schedule, batchQuery and namespaced params', () => {
      expect(buildBatchActionBody({
        actionName: 'email-pullslips',
        batchQuery: 'state==REQ',
        days: [1, 3, 5],
        hours: '6, 13',
        minute: 30,
        actionParams: { includePdf: true },
      })).toEqual({
        actionName: 'email-pullslips',
        batchQuery: 'state==REQ',
        schedule: scheduleToExpression({ days: [1, 3, 5], hours: '6, 13', minute: 30 }),
        actionParams: { includePdf: true },
      });
    });

    it('defaults actionParams to an empty object', () => {
      expect(buildBatchActionBody({ actionName: 'email-pullslips', days: [], hours: '', minute: 0 }).actionParams)
        .toEqual({});
    });
  });

  describe('recordToFormValues', () => {
    it('expands a record into schedule fields plus passthrough', () => {
      const schedule = 'FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=6,13;BYMINUTE=30';
      expect(recordToFormValues({
        actionName: 'email-pullslips',
        schedule,
        batchQuery: 'state==REQ',
        actionParams: { includePdf: true },
      })).toEqual({
        actionName: 'email-pullslips',
        batchQuery: 'state==REQ',
        ...scheduleFromExpression(schedule),
        actionParams: { includePdf: true },
      });
    });
  });
});
