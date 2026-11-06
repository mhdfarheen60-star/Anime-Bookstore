// ISBN helpers shared by the controllers, the cover lookup and the cover script.

// "978-1-4215-8564-2" -> "9781421585642"
export const normalizeIsbn = (value) => String(value ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();

export const isValidIsbn13 = (digits) => {
  if (!/^\d{13}$/.test(digits)) return false;
  let total = 0;
  for (let i = 0; i < 12; i++) total += Number(digits[i]) * (i % 2 ? 3 : 1);
  return (10 - (total % 10)) % 10 === Number(digits[12]);
};

export const isValidIsbn10 = (digits) => {
  if (!/^\d{9}[\dX]$/.test(digits)) return false;
  let total = 0;
  for (let i = 0; i < 10; i++) total += (digits[i] === 'X' ? 10 : Number(digits[i])) * (10 - i);
  return total % 11 === 0;
};

export const isValidIsbn = (value) => {
  const digits = normalizeIsbn(value);
  return isValidIsbn13(digits) || isValidIsbn10(digits);
};

// Stored ISBNs mix "978-1421585642" and "9781421585642". This builds a query
// that matches the same ISBN whichever way it was hyphenated.
export const isbnQuery = (value) => {
  const digits = normalizeIsbn(value);
  if (!digits) return null;
  return { $regex: `^${digits.split('').join('[- ]?')}$`, $options: 'i' };
};
