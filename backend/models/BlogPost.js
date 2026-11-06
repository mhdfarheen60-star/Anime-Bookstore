import mongoose from 'mongoose';

// A blog post is editorial content written by an admin. Drafts never leave the
// admin panel: the public API only ever returns posts with status "published".
const blogPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    // Stable, human-readable URL segment: /blog/<slug>
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      trim: true,
      lowercase: true,
      maxlength: [220, 'Slug cannot exceed 220 characters'],
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [500, 'Excerpt cannot exceed 500 characters'],
    },
    // Plain text. Blank lines separate paragraphs, "## " starts a section
    // heading and "- " starts a bullet list.
    content: {
      type: String,
      required: [true, 'Content is required'],
      maxlength: [60000, 'Content cannot exceed 60000 characters'],
    },
    // Absolute http(s) URL or an /uploads/blog/... path for an uploaded image.
    coverImage: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || /^https?:\/\//i.test(value) || /^\/uploads\/blog\/[\w.-]+$/.test(value),
        message: 'Cover image must be an http(s) URL or an uploaded image',
      },
    },
    category: {
      type: String,
      trim: true,
      maxlength: [60, 'Category cannot exceed 60 characters'],
      default: 'Journal',
    },
    tags: {
      type: [String],
      default: [],
    },
    author: {
      type: String,
      trim: true,
      maxlength: [100, 'Author cannot exceed 100 characters'],
      default: 'Book Store Editorial',
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    publishedAt: {
      type: Date,
    },
    // The lead story on the public blog index.
    featured: {
      type: Boolean,
      default: false,
    },
    // Estimated reading time in minutes, derived from the content.
    readingTime: {
      type: Number,
      default: 1,
      min: [1, 'Reading time cannot be less than 1 minute'],
    },
  },
  {
    timestamps: true,
  }
);

blogPostSchema.index({ slug: 1 }, { unique: true });
blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1, status: 1 });
blogPostSchema.index({ title: 'text', excerpt: 'text', content: 'text' });

// Average adult reading speed for prose, in words per minute.
const WORDS_PER_MINUTE = 220;

/** Rough reading-time estimate, in whole minutes (never below 1). */
export const estimateReadingTime = (content = '') => {
  const words = String(content).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
};

/** "A New Chapter Arrives" -> "a-new-chapter-arrives" */
export const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200) || 'post';

const BlogPost = mongoose.model('BlogPost', blogPostSchema);
export default BlogPost;
