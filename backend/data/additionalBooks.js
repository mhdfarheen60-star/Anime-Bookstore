// Books added to the catalogue after the original seed. Used by
// scripts/addBooks.js (adds them to an existing database), seed.js (fresh
// installs) and data/verifiedCovers.js (cover audit).
//
// ISBN, publisher, year and cover come from each edition's Open Library record
// (looked up by ISBN on 2026-10-13). Every cover was downloaded and checked by
// eye for the series, volume number and English edition. publishedYear is left
// out where the catalogue date was clearly not the English release date.
//
// price and stock are starting values for the shop to adjust; no rating or
// discount is set, since none is known.

const ol = (id) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;

export const additionalBooks = [
  {
    title: 'One Piece, Vol. 1', author: 'Eiichiro Oda', category: 'Adventure',
    series: 'One Piece', volumeNumber: 1,
    isbn: '9781569319017', publisher: 'VIZ Media', publishedYear: 2003, language: 'English',
    coverImage: ol(813900), price: 10, stock: 40,
    colors: ['#c1272d', '#f2c230'], glyph: '海',
    description: 'Monkey D. Luffy, a boy whose body stretches like rubber, sets out to sea to find the legendary treasure One Piece and become King of the Pirates.',
  },
  {
    title: 'Naruto, Vol. 1', author: 'Masashi Kishimoto', category: 'Action',
    series: 'Naruto', volumeNumber: 1,
    isbn: '9781421526539', publisher: 'VIZ Media', publishedYear: 2008, language: 'English',
    coverImage: ol(7682400), price: 10, stock: 40,
    colors: ['#f08a24', '#1d3557'], glyph: '忍',
    description: 'Naruto Uzumaki, a loud-mouthed outcast who carries a fox demon sealed inside him, trains as a ninja and dreams of becoming Hokage, the leader of his village.',
  },
  {
    title: 'Bleach, Vol. 1', author: 'Tite Kubo', category: 'Supernatural',
    series: 'Bleach', volumeNumber: 1,
    isbn: '9781591164418', publisher: 'VIZ Media', language: 'English',
    coverImage: ol(7337401), price: 10, stock: 40,
    colors: ['#111111', '#e85d04'], glyph: '死',
    description: 'Ichigo Kurosaki has always been able to see ghosts. When a Soul Reaper lends him her powers, he takes on her duty of protecting the living from Hollows.',
  },
  {
    title: 'Tokyo Ghoul, Vol. 1', author: 'Sui Ishida', category: 'Horror',
    series: 'Tokyo Ghoul', volumeNumber: 1,
    isbn: '9781421580364', publisher: 'VIZ Media', language: 'English',
    coverImage: ol(12879088), price: 12, stock: 35,
    colors: ['#1c1c1c', '#8b0000'], glyph: '喰',
    description: 'After a deadly encounter, college student Ken Kaneki becomes half-ghoul and must survive in the hidden world of flesh-eating ghouls while holding on to his humanity.',
  },
  {
    title: 'Solo Leveling, Vol. 1', author: 'Chugong & DUBU (Redice Studio)', category: 'Fantasy',
    series: 'Solo Leveling', volumeNumber: 1,
    isbn: '9781975319434', publisher: 'Yen Press', publishedYear: 2021, language: 'English',
    coverImage: ol(10839422), price: 20, stock: 30,
    colors: ['#1a1033', '#6c3bd1'], glyph: '王',
    description: 'Jinwoo Sung, the weakest hunter alive, survives a deadly dungeon and gains a mysterious System that lets him level up, something no other hunter can do. Full-colour comic edition.',
  },
  {
    title: 'Jujutsu Kaisen, Vol. 1', author: 'Gege Akutami', category: 'Supernatural',
    series: 'Jujutsu Kaisen', volumeNumber: 1,
    isbn: '9781974710027', publisher: 'VIZ Media', publishedYear: 2019, language: 'English',
    coverImage: ol(9270022), price: 10, stock: 45,
    colors: ['#1b1464', '#2f6f5e'], glyph: '呪',
    description: 'High schooler Yuji Itadori swallows a cursed finger to save his friends and becomes host to Sukuna, the King of Curses, pulling him into the world of jujutsu sorcerers.',
  },
  {
    title: 'Demon Slayer: Kimetsu no Yaiba, Vol. 1', author: 'Koyoharu Gotouge', category: 'Action',
    series: 'Demon Slayer: Kimetsu no Yaiba', volumeNumber: 1,
    isbn: '9781974700523', publisher: 'VIZ Media', publishedYear: 2018, language: 'English',
    coverImage: ol(15221139), price: 10, stock: 45,
    colors: ['#0b3d2e', '#c1121f'], glyph: '鬼',
    description: 'When demons slaughter his family and turn his sister Nezuko into one of them, Tanjiro Kamado sets out to become a demon slayer and find a way to make her human again.',
  },
  {
    title: 'Attack on Titan, Vol. 2', author: 'Hajime Isayama', category: 'Dark Fantasy',
    series: 'Attack on Titan', volumeNumber: 2,
    isbn: '9781612620251', publisher: 'Kodansha Comics', publishedYear: 2012, language: 'English',
    coverImage: ol(8750509), price: 12, stock: 40,
    colors: ['#3b2a20', '#6b705c'], glyph: '進',
    description: 'The Titans have broken into Trost District, and the trainee soldiers who were meant to hold the line are falling fast. Then a Titan appears that fights its own kind.',
  },
  {
    title: 'Chainsaw Man, Vol. 2', author: 'Tatsuki Fujimoto', category: 'Horror',
    series: 'Chainsaw Man', volumeNumber: 2,
    isbn: '9781974709946', publisher: 'VIZ Media', publishedYear: 2020, language: 'English',
    coverImage: ol(12794652), price: 10, stock: 40,
    colors: ['#b3261e', '#f4a3b4'], glyph: '電',
    description: 'Denji settles into life as a Public Safety devil hunter alongside Power, the Blood Fiend, until a hunt for the Bat Devil goes very wrong.',
  },
  {
    title: 'My Hero Academia, Vol. 2', author: 'Kohei Horikoshi', category: 'Action',
    series: 'My Hero Academia', volumeNumber: 2,
    isbn: '9781421582702', publisher: 'VIZ Media', publishedYear: 2015, language: 'English',
    coverImage: ol(8491062), price: 10, stock: 40,
    colors: ['#c1121f', '#0f6b4a'], glyph: '英',
    description: 'Izuku starts life at U.A. High, where a fierce first battle-training exercise pits him directly against his rival, Katsuki Bakugo.',
  },
  {
    title: 'Dragon Ball, Vol. 2', author: 'Akira Toriyama', category: 'Adventure',
    series: 'Dragon Ball', volumeNumber: 2,
    isbn: '9781569319215', publisher: 'VIZ Media', publishedYear: 2003, language: 'English',
    coverImage: ol(12488220), price: 10, stock: 40,
    colors: ['#e8590c', '#3a86ff'], glyph: '龍',
    description: 'Goku and Bulma\'s hunt for the Dragon Balls leads them into a showdown with the Emperor Pilaf, who wants to use the wish to rule the world.',
  },
];

export default additionalBooks;
