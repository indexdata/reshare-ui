import { findAgreedCost } from './formatCondition';

const cond = (props) => ({
  kind: 'condition',
  fromSymbol: 'ISIL:SUP',
  receipt: 'ACCEPTED',
  ...props,
});

describe('findAgreedCost', () => {
  it('takes the most recently accepted priced condition', () => {
    expect(findAgreedCost([
      cond({ id: 'old', cost: 5, createdAt: '2026-01-01T00:00:00Z' }),
      cond({ id: 'new', cost: 9, createdAt: '2026-01-03T00:00:00Z' }),
      cond({ id: 'mid', cost: 7, createdAt: '2026-01-02T00:00:00Z' }),
    ], 'ISIL:SUP').id).toBe('new');
  });

  it('ignores conditions that were rejected or not yet answered', () => {
    expect(findAgreedCost([
      cond({ id: 'rejected', receipt: 'REJECTED', cost: 9, createdAt: '2026-01-03T00:00:00Z' }),
      cond({ id: 'pending', receipt: 'SEEN', cost: 8, createdAt: '2026-01-04T00:00:00Z' }),
      cond({ id: 'accepted', cost: 5, createdAt: '2026-01-01T00:00:00Z' }),
    ], 'ISIL:SUP').id).toBe('accepted');
  });

  it('ignores costs agreed with a different supplier in the rota', () => {
    expect(findAgreedCost([
      cond({ id: 'other', fromSymbol: 'ISIL:OTHER', cost: 99, createdAt: '2026-01-09T00:00:00Z' }),
    ], 'ISIL:SUP')).toBeUndefined();
  });

  it('keeps a zero cost, which differs from no cost agreed', () => {
    expect(findAgreedCost([
      cond({ id: 'free', cost: 0, createdAt: '2026-01-01T00:00:00Z' }),
    ], 'ISIL:SUP').id).toBe('free');
  });
});
