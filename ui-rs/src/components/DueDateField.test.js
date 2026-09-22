import { validateDueDate } from './DueDateField';

describe('validateDueDate', () => {
  it.each([undefined, '', '2026-10-18', '2028-02-29'])('accepts %p', value => {
    expect(validateDueDate(value)).toBeUndefined();
  });

  it.each([
    'next week', '10/18/2026', '2026-10-1', '2026-02-30', '2027-02-29',
    '2026-13-18', '2026-01-32', '2026-00-10', '0000-00-00',
  ])('rejects %p', value => {
    expect(validateDueDate(value)).toBeDefined();
  });
});
