// Local disk storage for admin-uploaded blog images.
// Files live in backend/uploads/blog and are served at /uploads/blog/<file>.

import path from 'node:path';
import { deleteImage, saveImage, UPLOADS_ROOT } from './imageStorage.js';

export const BLOG_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'blog');
export const BLOG_PATH_PREFIX = '/uploads/blog/';
export const MAX_BLOG_IMAGE_BYTES = 5 * 1024 * 1024;

/** Saves an uploaded blog image and returns its public path. */
export const saveBlogImage = (buffer) =>
  saveImage(buffer, { folder: 'blog', prefix: BLOG_PATH_PREFIX, maxBytes: MAX_BLOG_IMAGE_BYTES });

export const isUploadedBlogImage = (ref) => typeof ref === 'string' && ref.startsWith(BLOG_PATH_PREFIX);

/** Deletes an uploaded blog image. Callers must make sure no post still uses it. */
export const deleteBlogImage = (ref) => deleteImage(ref, { prefix: BLOG_PATH_PREFIX, folder: 'blog' });
