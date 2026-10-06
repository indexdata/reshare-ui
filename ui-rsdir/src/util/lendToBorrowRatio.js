const ratioPattern = /^[0-9]{1,4}(?:\.[0-9]{1,2})?:[0-9]{1,4}(?:\.[0-9]{1,2})?$/;

const isValidLendToBorrowRatio = value => {
  if (value === undefined || value === null || value === '') return true;

  // Compare the full match because JavaScript's $ also matches before a final newline.
  return typeof value === 'string'
    && ratioPattern.exec(value)?.[0] === value
    && value.split(':').every(part => Number(part) >= 0.01 && Number(part) <= 9999.99);
};

const normalizeLendToBorrowRatio = value => {
  if (typeof value !== 'string' || !value || !isValidLendToBorrowRatio(value)) return value;

  return value.split(':').map(part => part.replace(/^0+/, '0')).join(':');
};

export {
  isValidLendToBorrowRatio,
  normalizeLendToBorrowRatio,
};
