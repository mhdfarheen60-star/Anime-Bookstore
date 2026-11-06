import { readFile, writeFile } from 'node:fs/promises';

const dump = (await readFile(new URL('../reports/_catalog-dump.txt', import.meta.url), 'utf8')).replace(/^\uFEFF/, '');
const books = dump
  .split(/\r?\n/)
  .map((l) => l.replace(/\u0000/g, ''))
  .filter((l) => l.startsWith('{'))
  .map((l) => JSON.parse(l));

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

const targets = books.filter((b) => !b.cover && isValidIsbn(b.isbn) && !synthetic(b.isbn));
const out = [];
for (const book of targets) {
  const isbn = String(book.isbn).replace(/[^0-9Xx]/g, '');
  let edition = null;
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, { headers: { 'User-Agent': 'AnimeBookstore/1.0' } });
    if (res.ok) edition = await res.json();
  } catch {}
  out.push({
    storeTitle: book.title,
    storeAuthor: book.author,
    storeIsbn: book.isbn,
    found: edition
      ? {
          title: edition.title,
          subtitle: edition.subtitle,
          volume: edition.volume,
          covers: edition.covers,
          publishers: edition.publishers,
          publish_date: edition.publish_date,
          languages: (edition.languages || []).map((l) => l.key),
          works: (edition.works || []).map((w) => w.key),
        }
      : null,
  });
}
await writeFile(new URL('../reports/_isbn-lookup.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} ISBN lookups`);
