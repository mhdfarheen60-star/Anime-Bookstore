import { readFile } from 'node:fs/promises';

const dump = (await readFile(new URL('../reports/_catalog-dump.txt', import.meta.url), 'utf8')).replace(/^\uFEFF/, '');
const lines = dump.split(/\r?\n/).filter(Boolean);
const books = lines
  .map((l) => l.replace(/\u0000/g, ''))
  .filter((l) => l.startsWith('{'))
  .map((l) => JSON.parse(l));
const coverless = books.filter((b) => !b.cover);

const isValidIsbn = (raw) => {
  const s = String(raw || '').replace(/[^0-9Xx]/g, '').toUpperCase();
  if (s.length === 13) {
    if (!/^\d{13}$/.test(s)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(s[i]) * (i % 2 ? 3 : 1);
    return (10 - (sum % 10)) % 10 === Number(s[12]);
  }
  if (s.length === 10) {
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(s[i]) * (10 - i);
    sum += s[9] === 'X' ? 10 : Number(s[9]);
    return sum % 11 === 0;
  }
  return false;
};
const synthetic = (isbn) => /^97[89](83|84)0000/.test(String(isbn).replace(/[^0-9]/g, ''));

const realValid = coverless.filter((b) => isValidIsbn(b.isbn) && !synthetic(b.isbn));
const byCat = {};
for (const b of realValid) byCat[b.category] = (byCat[b.category] || 0) + 1;

console.log('coverless', coverless.length);
console.log('real+valid isbn', realValid.length, byCat);
console.log('synthetic/invalid', coverless.length - realValid.length);
console.log('\nREAL ISBN BOOKS:');
for (const b of realValid) console.log(`${b.category} | ${b.title} | isbn=${b.isbn} | series=${b.series} vol=${b.vol}`);
console.log('\nSYNTHETIC/INVALID BOOKS:');
for (const b of coverless.filter((x) => !realValid.includes(x))) console.log(`${b.category} | ${b.title} | isbn=${b.isbn} | series=${b.series} vol=${b.vol}`);
