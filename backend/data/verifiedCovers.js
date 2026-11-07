// Reviewed cover assignments for the catalogue, used by scripts/updateCovers.js.
//
// Every entry with a `coverUrl` was checked by hand on 2026-10-13: the edition
// record was fetched from Open Library by ISBN, the cover image was downloaded,
// and it was looked at to confirm the series, the volume number and the English
// edition printed on it. Entries without a `coverUrl` are books where no cover
// could be verified, or where the stored data conflicts and a person has to
// decide which product the store is actually selling.
//
// Fields:
//   title / author   - how the book is stored in the database (used for matching)
//   storedIsbn       - the ISBN currently in the database (matched first)
//   catalogIsbn      - the ISBN of the edition whose cover was verified
//   series, volumeNumber - filled in on the book if they are empty
//   coverUrl         - Open Library ID-based cover URL (the form OL asks clients to use)
//   replaceExisting  - true only where the current cover was checked and found wrong
//                      or is hotlinked from a site that doesn't permit it
//   note             - what was found; copied into the report

import { additionalBooks } from './additionalBooks.js';
import { catalogueCoverEntries } from './catalogueCoverEntries.js';

const ol = (id) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;
const SOURCE = 'Open Library';

export const VERIFIED_ON = '2026-10-13';
 
export const verifiedCovers = [
  // ---- Bulk catalogue pass (reviewed 2026-11-07) ----------------------------
  // Generated into data/catalogueCoverEntries.js: Open Library covers that were
  // downloaded and visually checked, plus exact publisher product covers for
  // VIZ Media, Yen Press, Kodansha Comics, Vertical and J-Novel Club. Publisher
  // entries take precedence over Open Library for the same title. These come
  // first so they win the ISBN/title match for any book reviewed here.
  ...catalogueCoverEntries,

  // ---- Anime artbooks and guidebooks (reviewed 2026-11-04) ------------------
  // Only covers whose publisher record matches the exact product are listed.
  // Where no such cover exists the entry has no coverUrl: the script leaves the
  // storefront placeholder in place (or clears a known-wrong cover).
  {
    title: 'Overlord: The Complete Anime Artbook', author: 'Kugane Maruyama',
    storedIsbn: '9798400003059', catalogIsbn: '9781975314323',
    coverUrl: 'https://images.yenpress.com/imgs/9781975314323.jpg?w=408&h=612&type=books',
    cacheName: 'verified-overlord-complete-anime-artbook',
    source: 'Yen Press', verifiedOn: '2026-11-04', replaceExisting: true,
    note: 'Yen Press product 9781975314323, "Overlord: The Complete Anime Artbook" (2020). The stored ISBN is a synthetic catalogue placeholder; the cover is cached locally on first apply.',
  },
  {
    title: 'The Art of Sword Art Online', author: 'Reki Kawahara',
    storedIsbn: '9781016331647', catalogIsbn: '9780316442619',
    coverUrl: 'https://images.yenpress.com/imgs/9780316442619.jpg?w=408&h=612&type=books',
    cacheName: 'verified-sword-art-online-abec-artworks',
    source: 'Yen Press', verifiedOn: '2026-11-04', replaceExisting: true,
    note: 'Yen Press "Sword Art Online abec Artworks" (ISBN 9780316442619). The previous Open Library image belonged to an unrelated fencing book with the same stored ISBN.',
  },
  {
    title: 'Classroom of the Elite: Year 2 Official Guidebook', author: 'Syougo Kinugasa',
    storedIsbn: '9784040642529', catalogIsbn: '9784040642529',
    clearExisting: true, source: 'No verified cover', verifiedOn: '2026-11-04',
    note: 'No verified English cover exists for this Year 2 guidebook. The stored ISBN/covers belong to "Classroom of the Elite Owari 1st Year BOX Tomose Shunsaku Art Works", so the mismatched cover is cleared and the placeholder is shown until a correct cover is uploaded.',
  },
  {
    title: 'Re:ZERO Official Art Book', author: 'Tappei Nagatsuki',
    storedIsbn: '9798400003042', source: 'No verified cover', verifiedOn: '2026-11-04',
    suppressAutoCover: true,
    note: 'No verified official English art book with this exact title/ISBN was found. Kept on the neutral placeholder rather than assigning unrelated anime artwork.',
  },

  {
    title: 'One-Punch Man, Vol. 6', author: 'ONE',
    storedIsbn: '978-1421585642', catalogIsbn: '9781421585277',
    series: 'One-Punch Man', volumeNumber: 6,
    coverUrl: ol(14577617), source: SOURCE, replaceExisting: true,
    note: 'Current image is the correct Vol. 6 cover but is hotlinked from Amazon. Stored ISBN 9781421585642 is One-Punch Man Vol. 1; Vol. 6 is 9781421585277.',
  },
  {
    title: 'Jujutsu Kaisen, Vol. 4', author: 'Gege Akutami',
    storedIsbn: '978-1974718727', catalogIsbn: '9781974714803',
    series: 'Jujutsu Kaisen', volumeNumber: 4,
    coverUrl: ol(10151364), source: SOURCE, replaceExisting: true,
    note: 'Current image shows Jujutsu Kaisen Vol. 1, not Vol. 4. Stored ISBN fails the ISBN checksum.',
  },
  {
    title: 'Spider-Man: Original Manga - Shadow Warrior', author: 'Kazuki Takahashi',
    storedIsbn: '978-4088806515', catalogIsbn: '9781546148494',
    series: 'Spider-Man: Shadow Warrior',
    note: 'Current Amazon image is the correct cover, but it is hotlinked from Amazon and no permitted catalogue cover was found (Open Library has none). Upload a licensed copy. The cover credits Shogo Aoki, not Kazuki Takahashi. Stored ISBN fails the checksum; Open Library lists 9781546148494 (Scholastic).',
  },
  {
    title: 'Demon Slayer: Kimetsu no Yaiba, Vol. 2', author: 'Koyoharu Gotouge',
    storedIsbn: '978-1974707523', catalogIsbn: '9781974700530',
    series: 'Demon Slayer: Kimetsu no Yaiba', volumeNumber: 2,
    coverUrl: ol(14323087), source: SOURCE, replaceExisting: true,
    note: 'Current image shows Demon Slayer Vol. 23, not Vol. 2. Stored ISBN fails the ISBN checksum.',
  },
  {
    title: 'Attack on Titan, Vol. 1', author: 'Hajime Isayama',
    storedIsbn: '978-1612620244', catalogIsbn: '9781612620244',
    series: 'Attack on Titan', volumeNumber: 1,
    coverUrl: ol(15212776), source: SOURCE,
    note: 'ISBN and cover match (Kodansha Comics, 2012).',
  },
  {
    title: 'Fullmetal Alchemist, Vol. 1', author: 'Hiromu Arakawa',
    storedIsbn: '978-1591169208', catalogIsbn: '9781591169208',
    series: 'Fullmetal Alchemist', volumeNumber: 1,
    coverUrl: ol(15234071), source: SOURCE,
    note: 'ISBN and cover match (VIZ Media, 2005).',
  },
  {
    title: 'Death Note, Vol. 1', author: 'Tsugumi Ohba & Takeshi Obata',
    storedIsbn: '978-1421539645',
    series: 'Death Note', volumeNumber: 1,
    note: 'Needs a decision: stored ISBN 9781421539645 is "Death Note Black Edition, Vol. 1" (collects Vols. 1-2), but the title says "Death Note, Vol. 1". Verified covers exist for both: standard Vol. 1 = ISBN 9781421501680 (covers.openlibrary.org/b/id/764904-L.jpg), Black Edition Vol. 1 = covers.openlibrary.org/b/id/8745663-L.jpg. Fix the title or the ISBN, then pick the cover in the admin panel.',
  },
  {
    title: 'My Hero Academia, Vol. 1', author: 'Kohei Horikoshi',
    storedIsbn: '978-1421582696', catalogIsbn: '9781421582696',
    series: 'My Hero Academia', volumeNumber: 1,
    coverUrl: ol(11762278), source: SOURCE,
    note: 'ISBN and cover match (VIZ Media, 2015).',
  },
  {
    title: 'Chainsaw Man, Vol. 1', author: 'Tatsuki Fujimoto',
    storedIsbn: '978-1974709930', catalogIsbn: '9781974709939',
    series: 'Chainsaw Man', volumeNumber: 1,
    coverUrl: ol(12794650), source: SOURCE,
    note: 'Stored ISBN fails the checksum (last digit); catalogue ISBN is 9781974709939.',
  },
  {
    title: 'Spy x Family, Vol. 1', author: 'Tatsuya Endo',
    storedIsbn: '978-1974715467', catalogIsbn: '9781974715466',
    series: 'Spy x Family', volumeNumber: 1,
    coverUrl: ol(14582895), source: SOURCE,
    note: 'Stored ISBN fails the checksum (last digit); catalogue ISBN is 9781974715466.',
  },
  {
    title: 'Berserk Deluxe, Vol. 1', author: 'Kentaro Miura',
    storedIsbn: '978-1506716970', catalogIsbn: '9781506711980',
    series: 'Berserk Deluxe', volumeNumber: 1,
    coverUrl: ol(8746964), source: SOURCE,
    note: 'Stored ISBN fails the checksum; catalogue ISBN for Berserk Deluxe Volume 1 (Dark Horse, 2019) is 9781506711980.',
  },
  {
    title: 'Vagabond, Vol. 1', author: 'Takehiko Inoue',
    storedIsbn: '978-1421520544',
    series: 'Vagabond', volumeNumber: 1,
    note: 'Needs a decision: stored ISBN 9781421520544 is "Vagabond VIZBIG Edition, Vol. 1" (verified cover: covers.openlibrary.org/b/id/12856568-L.jpg), but the title says "Vagabond, Vol. 1". Rename the book to the VIZBIG edition or correct the ISBN, then pick the cover in the admin panel.',
  },
  {
    title: 'Vinland Saga, Book 1', author: 'Makoto Yukimura',
    storedIsbn: '978-1612624204', catalogIsbn: '9781612624204',
    series: 'Vinland Saga', volumeNumber: 1,
    coverUrl: ol(15218202), source: SOURCE,
    note: 'ISBN and cover match (Kodansha Comics hardcover, Book One).',
  },
  {
    title: "Frieren: Beyond Journey's End, Vol. 1", author: 'Kanehito Yamada & Tsukasa Abe',
    storedIsbn: '978-1974727231', catalogIsbn: '9781974725762',
    series: "Frieren: Beyond Journey's End", volumeNumber: 1,
    coverUrl: ol(15144668), source: SOURCE,
    note: 'Stored ISBN fails the checksum; catalogue ISBN is 9781974725762.',
  },
  {
    title: 'Blue Lock, Vol. 1', author: 'Muneyuki Kaneshiro',
    storedIsbn: '978-1646511111', catalogIsbn: '9781646516544',
    series: 'Blue Lock', volumeNumber: 1,
    coverUrl: ol(12818592), source: SOURCE,
    note: 'Stored ISBN fails the checksum; catalogue ISBN is 9781646516544 (Kodansha, 2022).',
  },
  {
    title: 'Dandadan, Vol. 1', author: 'Yukinobu Tatsu',
    storedIsbn: '978-1974738381', catalogIsbn: '9781974734634',
    series: 'Dandadan', volumeNumber: 1,
    coverUrl: ol(15151083), source: SOURCE,
    note: 'Stored ISBN fails the checksum; catalogue ISBN is 9781974734634.',
  },
  {
    title: 'Dragon Ball, Vol. 1', author: 'Akira Toriyama',
    storedIsbn: '978-1569319207', catalogIsbn: '9781569319208',
    series: 'Dragon Ball', volumeNumber: 1,
    coverUrl: ol(14650976), source: SOURCE,
    note: 'Stored ISBN fails the checksum (last digit); catalogue ISBN is 9781569319208.',
  },

  // Books added later; their covers were checked the same way (see additionalBooks.js).
  ...additionalBooks.map((book) => ({
    title: book.title, author: book.author,
    storedIsbn: book.isbn, catalogIsbn: book.isbn,
    series: book.series, volumeNumber: book.volumeNumber,
    coverUrl: book.coverImage, source: SOURCE,
    note: 'Added from data/additionalBooks.js; ISBN and cover match.',
  })),
];

export default verifiedCovers;
