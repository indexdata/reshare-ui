import { isValidLendToBorrowRatio, normalizeLendToBorrowRatio } from './lendToBorrowRatio';
import { lendToBorrowRatio } from './validators';

describe('lending-to-borrowing ratio validation', () => {
  it.each([
    undefined, null, '', '50:2', '0.01:9999.99', '9999.99:0.01',
    '0001:0002', '0000.01:2.50', '0000.10:0000.99', '1.0:2.00',
  ])('accepts %p', value => {
    expect(isValidLendToBorrowRatio(value)).toBe(true);
    expect(lendToBorrowRatio(value)).toBeUndefined();
  });

  it.each([
    '0:1', '1:0', '0.00:2', '2:0000', '-1:2', '1:+2', '1e2:1',
    '1 :2', ' 1:2', '1:2 ', '1:2\n', '1:\n2', '.5:1', '1:2.',
    '1', ':1', '1:', '1:2:3', '10000:1', '1:10000', '00001:1',
    '1:00001', '1.001:1', '1:1.001', '0.001:1', '1:0.001',
    '9999.99:9999.999', '1,5:2', 12, {},
  ])('rejects %p', value => {
    expect(isValidLendToBorrowRatio(value)).toBe(false);
    expect(lendToBorrowRatio(value).props.id).toBe('ui-rsdir.entry.lendToBorrowRatio.invalid');
    expect(normalizeLendToBorrowRatio(value)).toBe(value);
  });
});

describe('lending-to-borrowing ratio normalization', () => {
  it.each([
    ['0001:0002', '01:02'],
    ['0000.01:2.50', '0.01:2.50'],
    ['0000.50:0002.00', '0.50:02.00'],
    ['01:02', '01:02'],
    ['50:2', '50:2'],
    [undefined, undefined],
    [null, null],
    ['', ''],
  ])('normalizes %p to %p and is idempotent', (value, expected) => {
    expect(normalizeLendToBorrowRatio(value)).toBe(expected);
    expect(normalizeLendToBorrowRatio(expected)).toBe(expected);
  });
});
