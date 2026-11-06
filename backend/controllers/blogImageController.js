import { AppError } from '../middleware/errorMiddleware.js';
import { saveBlogImage } from '../utils/blogImageStorage.js';

// POST /api/blog/images/upload  (body: raw image bytes, Content-Type: image/*)
const uploadBlogImage = async (req, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return next(new AppError('No image received. Choose a JPEG, PNG, WebP or GIF file.', 400));
    }
    const coverImage = await saveBlogImage(req.body);
    res.status(201).json({
      success: true,
      message: 'Image uploaded',
      data: { coverImage },
    });
  } catch (error) {
    if (error.statusCode === 400) return next(new AppError(error.message, 400));
    next(error);
  }
};

export { uploadBlogImage };
