import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
      maxlength: [100, 'Author name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    originalPrice: {
      type: Number,
      min: [0, 'Original price cannot be negative'],
      validate: {
        validator: function (value) {
          if (!value) return true;
          // On findByIdAndUpdate `this` is the Query, not the document, so read the
          // price from the update itself. If the update doesn't touch price we
          // can't compare here, so let it through.
          let price = this.price;
          if (this instanceof mongoose.Query) {
            const update = this.getUpdate() ?? {};
            price = update.$set?.price ?? update.price;
          }
          return price === undefined || price === null || value >= price;
        },
        message: 'Original price must be greater than or equal to price',
      },
    },
    // Absolute http(s) URL from a book catalogue, or a /uploads/covers/... path
    // for an image an admin uploaded. Never a base64 data URL.
    coverImage: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || /^https?:\/\//i.test(value) || /^\/uploads\/covers\/[\w.-]+$/.test(value),
        message: 'Cover image must be an http(s) URL or an uploaded cover',
      },
    },
    series: {
      type: String,
      trim: true,
      maxlength: [150, 'Series cannot exceed 150 characters'],
    },
    volumeNumber: {
      type: Number,
      min: [0, 'Volume number cannot be negative'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    isbn: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^[0-9Xx\-]{10,17}$/, 'Please provide a valid ISBN'],
    },
    publisher: {
      type: String,
      trim: true,
      maxlength: [100, 'Publisher name cannot exceed 100 characters'],
    },
    illustrator: {
      type: String,
      trim: true,
      maxlength: [100, 'Illustrator name cannot exceed 100 characters'],
    },
    edition: {
      type: String,
      trim: true,
      maxlength: [120, 'Edition cannot exceed 120 characters'],
    },
    pages: {
      type: Number,
      min: [1, 'Page count must be at least 1'],
    },
    format: {
      type: String,
      trim: true,
      maxlength: [60, 'Format cannot exceed 60 characters'],
    },
    publicationDate: {
      type: Date,
    },
    seriesStatus: {
      type: String,
      trim: true,
      enum: {
        values: ['Ongoing', 'Completed', 'Upcoming'],
        message: 'Series status must be Ongoing, Completed or Upcoming',
      },
    },
    // Merchandising shelves (Bestsellers, New Releases, Preorders, Box Sets,
    // Omnibus Editions, ...). A book keeps one primary `category`, and tags let
    // it appear on additional shelves without duplicating the product.
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    publishedYear: {
      type: Number,
      min: [1000, 'Invalid year'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    language: {
      type: String,
      trim: true,
      default: 'English',
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    colors: {
      type: [String],
      default: ['#3b2a20', '#8a3b2b'],
    },
    glyph: {
      type: String,
      default: '书',
    },
  },
  {
    timestamps: true,
  }
);

bookSchema.index({ title: 'text', author: 'text', description: 'text' });
bookSchema.index({ category: 1 });
bookSchema.index({ featured: 1, isActive: 1 });
bookSchema.index({ price: 1 });
bookSchema.index({ rating: -1 });
bookSchema.index({ createdAt: -1 });
bookSchema.index({ isActive: 1, stock: 1 });
bookSchema.index({ series: 1, volumeNumber: 1 });

bookSchema.virtual('discountPercent').get(function () {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

bookSchema.set('toJSON', { virtuals: true });
bookSchema.set('toObject', { virtuals: true });

const Book = mongoose.model('Book', bookSchema);
export default Book;