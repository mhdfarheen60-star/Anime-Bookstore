import { readFile } from 'node:fs/promises';

const rows = JSON.parse(await readFile(new URL('../reports/_isbn-lookup.json', import.meta.url), 'utf8'));
for (const r of rows) {
  const e = r.found;
  const line = e
    ? `${e.title}${e.subtitle ? ' : ' + e.subtitle : ''} | vol=${e.volume ?? ''} | covers=${(e.covers || []).join(',')} | ${(e.languages || []).join(',')} | ${(e.publishers || []).join('/')} | ${e.publish_date ?? ''}`
    : 'NOT FOUND';
  console.log(`\n${r.storeTitle}  [${r.storeIsbn}]\n   -> ${line}`);
}
