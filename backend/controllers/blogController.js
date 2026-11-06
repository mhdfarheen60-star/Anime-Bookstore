import BlogPost, { estimateReadingTime, slugify } from '../models/BlogPost.js';
import { AppError } from '../middleware/errorMiddleware.js';
import escapeRegex from '../utils/escapeRegex.js';
import { deleteBlogImage, isUploadedBlogImage } from '../utils/blogImageStorage.js';

// Partial, case-insensitive match on the fields a reader would type.
const textMatch = (term) => {
  const pattern = { $regex: escapeRegex(String(term).trim()), $options: 'i' };
  return { $or: [{ title: pattern }, { excerpt: pattern }, { content: pattern }, { tags: pattern }] };
};

const isAdmin = (req) => req.user?.role === 'admin';

// Makes sure the slug is unique by appending -2, -3, ... when needed.
const uniqueSlug = async (base, excludeId) => {
  const root = slugify(base);
  let candidate = root;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (
    await BlogPost.exists({ slug: candidate, ...(excludeId && { _id: { $ne: excludeId } }) })
  ) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
  return candidate;
};

// Removes an uploaded blog image once no post references it any more.
const cleanUpImage = async (coverImage) => {
  if (!isUploadedBlogImage(coverImage)) return;
  const stillUsed = await BlogPost.exists({ coverImage });
  if (!stillUsed) await deleteBlogImage(coverImage);
};

/**
 * Public blog index. Only published posts are ever returned.
 * An admin may pass ?status=draft to preview their own drafts.
 */
const getPosts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 9,
      search,
      category,
      featured,
      status,
    } = req.query;

    const query = {};

    if (status && status !== 'all') {
      if (status === 'draft' && !isAdmin(req)) {
        return next(new AppError('Admin access required to preview drafts', 403));
      }
      query.status = status;
    } else {
      query.status = 'published';
    }

    if (search) Object.assign(query, textMatch(search));
    if (category) query.category = String(category);
    if (featured === 'true') query.featured = true;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      BlogPost.find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BlogPost.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalPosts: total,
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/** The lead story on the public blog index. */
const getFeaturedPost = async (req, res, next) => {
  try {
    const post = await BlogPost.findOne({ status: 'published', featured: true })
      .sort({ publishedAt: -1 })
      .lean();
    res.json({ success: true, data: { post } });
  } catch (error) {
    next(error);
  }
};

/** Blog categories that actually have published posts. */
const getCategories = async (req, res, next) => {
  try {
    const categories = await BlogPost.aggregate([
      { $match: { status: 'published', category: { $nin: [null, ''] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, name: '$_id', count: 1 } },
    ]);
    res.json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
};

/** A single post by slug. Drafts are visible to admins only. */
const getPostBySlug = async (req, res, next) => {
  try {
    const post = await BlogPost.findOne({ slug: String(req.params.slug).toLowerCase() });
    if (!post) return next(new AppError('Article not found', 404));
    if (post.status !== 'published' && !isAdmin(req)) {
      return next(new AppError('Article not found', 404));
    }
    res.json({ success: true, data: { post } });
  } catch (error) {
    next(error);
  }
};

/** Other published posts, preferring the same category. */
const getRelatedPosts = async (req, res, next) => {
  try {
    const current = await BlogPost.findOne({ slug: String(req.params.slug).toLowerCase() }).lean();
    if (!current) return next(new AppError('Article not found', 404));

    const sameCategory = await BlogPost.find({
      _id: { $ne: current._id },
      category: current.category,
      status: 'published',
    })
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean();

    const others = await BlogPost.find({
      _id: { $nin: [current._id, ...sameCategory.map((p) => p._id)] },
      status: 'published',
    })
      .sort({ publishedAt: -1 })
      .limit(Math.max(0, 3 - sameCategory.length))
      .lean();

    res.json({ success: true, data: { posts: [...sameCategory, ...others] } });
  } catch (error) {
    next(error);
  }
};

/** Admin: every post, drafts included. */
const getAllPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (search) Object.assign(query, textMatch(search));

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      BlogPost.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BlogPost.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalPosts: total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const createPost = async (req, res, next) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category,
      tags,
      author,
      status,
      featured,
    } = req.body;

    const post = await BlogPost.create({
      title,
      slug: await uniqueSlug(slug || title),
      excerpt,
      content,
      coverImage,
      category: category || 'Journal',
      tags: Array.isArray(tags) ? tags : [],
      author: author || req.user?.name || 'Book Store Editorial',
      status: status === 'published' ? 'published' : 'draft',
      publishedAt: status === 'published' ? new Date() : undefined,
      featured: Boolean(featured),
      readingTime: estimateReadingTime(content),
    });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: { post },
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('A post with this slug already exists', 409));
    }
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category,
      tags,
      author,
      status,
      featured,
    } = req.body;

    const current = await BlogPost.findById(req.params.id);
    if (!current) return next(new AppError('Post not found', 404));

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (content !== undefined) {
      updateData.content = content;
      updateData.readingTime = estimateReadingTime(content);
    }
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (author !== undefined) updateData.author = author;
    if (featured !== undefined) updateData.featured = Boolean(featured);
    if (slug !== undefined) updateData.slug = await uniqueSlug(slug || title || current.title, current._id);
    if (status !== undefined) {
      updateData.status = status === 'published' ? 'published' : 'draft';
      // Stamp the publication date the first time a post goes live.
      if (updateData.status === 'published' && !current.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const unset = {};
    if (coverImage === '' || coverImage === null) {
      delete updateData.coverImage;
      unset.coverImage = 1;
    }
    if (excerpt === '' || excerpt === null) {
      delete updateData.excerpt;
      unset.excerpt = 1;
    }

    const update = Object.keys(unset).length ? { $set: updateData, $unset: unset } : updateData;
    const post = await BlogPost.findByIdAndUpdate(current._id, update, {
      new: true,
      runValidators: true,
    });

    if (current.coverImage && current.coverImage !== post.coverImage) {
      await cleanUpImage(current.coverImage);
    }

    res.json({
      success: true,
      message: 'Post updated successfully',
      data: { post },
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('A post with this slug already exists', 409));
    }
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) return next(new AppError('Post not found', 404));

    await cleanUpImage(post.coverImage);

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export {
  getPosts,
  getFeaturedPost,
  getCategories,
  getPostBySlug,
  getRelatedPosts,
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
};
