import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Category from './models/Category.js';
import Book from './models/Book.js';
import { verifiedCovers } from './data/verifiedCovers.js';
import { additionalBooks } from './data/additionalBooks.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

const categories = [
  { name: 'Action', description: 'High-energy stories with battles and adventure', image: '' },
  { name: 'Supernatural', description: 'Stories involving ghosts, spirits, and supernatural phenomena', image: '' },
  { name: 'Dark Fantasy', description: 'Fantasy with darker, mature themes', image: '' },
  { name: 'Adventure', description: 'Exciting journeys and quests', image: '' },
  { name: 'Thriller', description: 'Suspenseful and exciting narratives', image: '' },
  { name: 'Comedy', description: 'Light-hearted and humorous stories', image: '' },
  { name: 'Historical', description: 'Stories set in historical periods', image: '' },
  { name: 'Romance', description: 'Love stories and romantic narratives', image: '' },
  { name: 'Fantasy', description: 'Magical worlds and fantastical adventures', image: '' },
  { name: 'Sports', description: 'Sports-themed stories and competitions', image: '' },
  { name: 'Horror', description: 'Scary and unsettling narratives', image: '' },
];

const books = [
  {
    title: 'One-Punch Man, Vol. 6',
    author: 'ONE',
    description: 'Saitama can defeat any enemy with a single punch, and the lack of a real challenge is starting to bore him.',
    price: 18,
    originalPrice: 22,
    isbn: '978-1421585642',
    publisher: 'VIZ Media',
    publishedYear: 2016,
    stock: 50,
    language: 'English',
    rating: 4.7,
    featured: true,
    colors: ['#f2c230', '#c1272d'],
    glyph: '拳',
  },
  {
    title: 'Jujutsu Kaisen, Vol. 4',
    author: 'Gege Akutami',
    description: 'Yuji Itadori swallows a cursed finger and joins Tokyo Jujutsu High to fight the curses hunting humanity.',
    price: 20,
    originalPrice: 25,
    isbn: '978-1974718727',
    publisher: 'VIZ Media',
    publishedYear: 2020,
    stock: 45,
    language: 'English',
    rating: 4.8,
    featured: true,
    colors: ['#1b1464', '#7b2ff7'],
    glyph: '呪',
  },
  {
    title: 'Spider-Man: Original Manga - Shadow Warrior',
    author: 'Kazuki Takahashi',
    description: 'The original Spider-Man manga collection, Shadow Warrior.',
    price: 22,
    originalPrice: 28,
    coverImage: 'https://m.media-amazon.com/images/I/81K69wZciiL._SY466_.jpg',
    isbn: '978-4088806515',
    publisher: 'Shueisha',
    publishedYear: 2019,
    stock: 30,
    language: 'English',
    rating: 4.2,
    featured: false,
    colors: ['#b3121a', '#1a237e'],
    glyph: '蜘',
  },
  {
    title: 'Demon Slayer: Kimetsu no Yaiba, Vol. 2',
    author: 'Koyoharu Gotouge',
    description: 'Tanjiro trains to become a demon slayer so he can turn his sister Nezuko back into a human.',
    price: 18,
    originalPrice: 22,
    isbn: '978-1974707523',
    publisher: 'VIZ Media',
    publishedYear: 2019,
    stock: 60,
    language: 'English',
    rating: 4.7,
    featured: true,
    colors: ['#0b3d2e', '#2fbf71'],
    glyph: '鬼',
  },
  {
    title: 'Attack on Titan, Vol. 1',
    author: 'Hajime Isayama',
    description: 'Humanity lives behind towering walls until a colossal titan breaks through. Eren Yeager vows to wipe the titans out.',
    price: 12,
    originalPrice: 15,
    isbn: '978-1612620244',
    publisher: 'Kodansha Comics',
    publishedYear: 2012,
    stock: 80,
    language: 'English',
    rating: 4.8,
    featured: true,
    colors: ['#3b2a20', '#8a3b2b'],
    glyph: '進',
  },
  {
    title: 'Fullmetal Alchemist, Vol. 1',
    author: 'Hiromu Arakawa',
    description: 'After a forbidden ritual costs them dearly, brothers Edward and Alphonse Elric search for the Philosopher\'s Stone.',
    price: 11,
    originalPrice: 14,
    isbn: '978-1591169208',
    publisher: 'VIZ Media',
    publishedYear: 2005,
    stock: 70,
    language: 'English',
    rating: 4.9,
    featured: false,
    colors: ['#7a1f1f', '#d9a441'],
    glyph: '鋼',
  },
  {
    title: 'Death Note, Vol. 1',
    author: 'Tsugumi Ohba & Takeshi Obata',
    description: 'A student finds a notebook that kills anyone whose name is written in it, and the detective L sets out to stop him.',
    price: 10,
    originalPrice: 13,
    isbn: '978-1421539645',
    publisher: 'VIZ Media',
    publishedYear: 2005,
    stock: 90,
    language: 'English',
    rating: 4.7,
    featured: false,
    colors: ['#111111', '#5a0f1a'],
    glyph: '死',
  },
  {
    title: 'My Hero Academia, Vol. 1',
    author: 'Kohei Horikoshi',
    description: 'In a world where nearly everyone has a superpower, Izuku Midoriya is born without one, until he meets the greatest hero.',
    price: 10,
    originalPrice: 13,
    isbn: '978-1421582696',
    publisher: 'VIZ Media',
    publishedYear: 2015,
    stock: 85,
    language: 'English',
    rating: 4.6,
    featured: true,
    colors: ['#0f6b4a', '#f2c230'],
    glyph: '英',
  },
  {
    title: 'Chainsaw Man, Vol. 1',
    author: 'Tatsuki Fujimoto',
    description: 'Debt-ridden Denji merges with his chainsaw devil pet and joins a government team of devil hunters.',
    price: 10,
    originalPrice: 13,
    isbn: '978-1974709930',
    publisher: 'VIZ Media',
    publishedYear: 2019,
    stock: 55,
    language: 'English',
    rating: 4.8,
    featured: true,
    colors: ['#b3261e', '#2a0d0d'],
    glyph: '電',
  },
  {
    title: 'Spy x Family, Vol. 1',
    author: 'Tatsuya Endo',
    description: 'A spy, an assassin and a telepathic child pose as a family for a secret mission, each hiding the truth from the others.',
    price: 10,
    originalPrice: 13,
    isbn: '978-1974715467',
    publisher: 'VIZ Media',
    publishedYear: 2020,
    stock: 65,
    language: 'English',
    rating: 4.8,
    featured: false,
    colors: ['#1f7a6d', '#f4b5c4'],
    glyph: '家',
  },
  {
    title: 'Berserk Deluxe, Vol. 1',
    author: 'Kentaro Miura',
    description: 'The lone mercenary Guts swings an enormous sword through a brutal medieval world of demons and betrayal.',
    price: 30,
    originalPrice: 40,
    isbn: '978-1506716970',
    publisher: 'Dark Horse Manga',
    publishedYear: 2019,
    stock: 25,
    language: 'English',
    rating: 4.9,
    featured: false,
    colors: ['#0b0b0e', '#4a4f5c'],
    glyph: '狂',
  },
  {
    title: 'Vagabond, Vol. 1',
    author: 'Takehiko Inoue',
    description: 'A fictionalised retelling of Miyamoto Musashi\'s path from a wild youth to Japan\'s most famous swordsman.',
    price: 20,
    originalPrice: 25,
    isbn: '978-1421520544',
    publisher: 'VIZ Media',
    publishedYear: 2002,
    stock: 35,
    language: 'English',
    rating: 4.9,
    featured: false,
    colors: ['#5c4a32', '#d8c9a3'],
    glyph: '剣',
  },
  {
    title: 'Your Name (Novel)',
    author: 'Makoto Shinkai',
    description: 'Two teenagers who swap bodies in their sleep try to find each other across distance and time.',
    price: 14,
    originalPrice: 18,
    isbn: '978-0316558556',
    publisher: 'Yen Press',
    publishedYear: 2017,
    stock: 40,
    language: 'English',
    rating: 4.6,
    featured: false,
    colors: ['#2b3a8c', '#ff7eb6'],
    glyph: '君',
  },
  {
    title: 'Vinland Saga, Book 1',
    author: 'Makoto Yukimura',
    description: 'A Viking-age epic that follows Thorfinn\'s quest for revenge, and what he becomes after it.',
    price: 25,
    originalPrice: 30,
    isbn: '978-1612624204',
    publisher: 'Kodansha Comics',
    publishedYear: 2013,
    stock: 30,
    language: 'English',
    rating: 4.8,
    featured: true,
    colors: ['#1c3b57', '#9fb8c9'],
    glyph: '海',
  },
  {
    title: 'Frieren: Beyond Journey\'s End, Vol. 1',
    author: 'Kanehito Yamada & Tsukasa Abe',
    description: 'After the hero party defeats the Demon King, the elf mage Frieren sets out to understand the humans she outlived.',
    price: 11,
    originalPrice: 14,
    isbn: '978-1974727231',
    publisher: 'VIZ Media',
    publishedYear: 2021,
    stock: 50,
    language: 'English',
    rating: 4.9,
    featured: true,
    colors: ['#5b6cff', '#c7d2ff'],
    glyph: '旅',
  },
  {
    title: 'Blue Lock, Vol. 1',
    author: 'Muneyuki Kaneshiro',
    description: 'Japan locks 300 strikers in a program built to create the world\'s most ruthless forward.',
    price: 11,
    originalPrice: 14,
    isbn: '978-1646511111',
    publisher: 'Kodansha Comics',
    publishedYear: 2021,
    stock: 45,
    language: 'English',
    rating: 4.5,
    featured: false,
    colors: ['#0a2a6b', '#2fb4ff'],
    glyph: '蹴',
  },
  {
    title: 'Dandadan, Vol. 1',
    author: 'Yukinobu Tatsu',
    description: 'A girl who believes in ghosts and a boy who believes in aliens both turn out to be right.',
    price: 12,
    originalPrice: 15,
    isbn: '978-1974738381',
    publisher: 'VIZ Media',
    publishedYear: 2021,
    stock: 40,
    language: 'English',
    rating: 4.7,
    featured: false,
    colors: ['#6a1b9a', '#ff9f1c'],
    glyph: '妖',
  },
  {
    title: 'Dragon Ball, Vol. 1',
    author: 'Akira Toriyama',
    description: 'Young Goku and Bulma hunt for the seven Dragon Balls in the story that shaped modern shonen.',
    price: 10,
    originalPrice: 13,
    isbn: '978-1569319207',
    publisher: 'VIZ Media',
    publishedYear: 2003,
    stock: 100,
    language: 'English',
    rating: 4.8,
    featured: false,
    colors: ['#e8590c', '#ffd43b'],
    glyph: '龍',
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Book.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({});

    console.log('Cleared existing data');

    // Create categories
    const createdCategories = await Category.insertMany(categories);
    console.log(`Created ${createdCategories.length} categories`);

    // Map category names to IDs
    const categoryMap = {};
    createdCategories.forEach((cat) => {
      categoryMap[cat.name] = cat._id;
    });

    // Assign categories to books
    const bookCategoryMap = {
      'One-Punch Man, Vol. 6': 'Action',
      'Jujutsu Kaisen, Vol. 4': 'Supernatural',
      'Spider-Man: Original Manga - Shadow Warrior': 'Action',
      'Demon Slayer: Kimetsu no Yaiba, Vol. 2': 'Action',
      'Attack on Titan, Vol. 1': 'Dark Fantasy',
      'Fullmetal Alchemist, Vol. 1': 'Adventure',
      'Death Note, Vol. 1': 'Thriller',
      'My Hero Academia, Vol. 1': 'Action',
      'Chainsaw Man, Vol. 1': 'Horror',
      'Spy x Family, Vol. 1': 'Comedy',
      'Berserk Deluxe, Vol. 1': 'Dark Fantasy',
      'Vagabond, Vol. 1': 'Historical',
      'Your Name (Novel)': 'Romance',
      'Vinland Saga, Book 1': 'Historical',
      'Frieren: Beyond Journey\'s End, Vol. 1': 'Fantasy',
      'Blue Lock, Vol. 1': 'Sports',
      'Dandadan, Vol. 1': 'Supernatural',
      'Dragon Ball, Vol. 1': 'Adventure',
    };

    // Covers, series and volume numbers come from the reviewed list in
    // data/verifiedCovers.js so every book gets its own checked cover (or none).
    const booksWithCategories = books.map((book) => {
      const reviewed = verifiedCovers.find((entry) => entry.title === book.title);
      return {
        ...book,
        series: reviewed?.series,
        volumeNumber: reviewed?.volumeNumber,
        coverImage: reviewed?.coverUrl ?? book.coverImage,
        category: categoryMap[bookCategoryMap[book.title]],
      };
    });

    const extraBooks = additionalBooks.map(({ category, ...book }) => ({
      ...book,
      category: categoryMap[category],
    }));

    await Book.insertMany([...booksWithCategories, ...extraBooks]);
    console.log(`Created ${booksWithCategories.length + extraBooks.length} books`);

    // Create admin/customer accounts. Passwords come from the environment;
    // when unset, strong random passwords are generated and printed exactly
    // once. Never seed known, guessable credentials.
    const crypto = await import('node:crypto');
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
    const customerPassword = process.env.SEED_CUSTOMER_PASSWORD || crypto.randomBytes(12).toString('base64url');
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log(`SEED_ADMIN_PASSWORD not set – generated admin password: ${adminPassword}`);
    }
    if (!process.env.SEED_CUSTOMER_PASSWORD) {
      console.log(`SEED_CUSTOMER_PASSWORD not set – generated customer password: ${customerPassword}`);
    }
    await User.create({
      name: 'Admin User',
      email: 'admin@bookstore.com',
      password: adminPassword,
      role: 'admin',
      isActive: true,
    });

    await User.create({
      name: 'Test Customer',
      email: 'customer@test.com',
      password: customerPassword,
      role: 'customer',
      isActive: true,
    });

    console.log('\n✅ Database seeded successfully!');
    console.log('\nAdmin login: admin@bookstore.com / see above (or SEED_ADMIN_PASSWORD)');
    console.log('Customer login: customer@test.com / see above (or SEED_CUSTOMER_PASSWORD)');
    console.log('\nStore these credentials somewhere safe and rotate them after first login.');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();