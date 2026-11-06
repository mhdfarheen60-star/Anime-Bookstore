// Local disk storage for admin-uploaded cover images.
// Files live in backend/uploads/covers and are served at /uploads/covers/<file>.
// The database stores only that path, never the image bytes.

import path from 'node:path';
import { deleteImage, detectImageType, saveImage, UPLOADS_ROOT } from './imageStorage.js';

export const UPLOADS_DIR = UPLOADS_ROOT;
export const COVERS_DIR = path.join(UPLOADS_DIR, 'covers');
export const COVER_PATH_PREFIX = '/uploads/covers/';
export const MAX_COVER_BYTES = 5 * 1024 * 1024;

export { detectImageType };

/** Saves an uploaded cover image buffer under a fresh unique name and returns its public path. */
export const saveCoverImage = (buffer, { name } = {}) =>
  saveImage(buffer, { folder: 'covers', prefix: COVER_PATH_PREFIX, maxBytes: MAX_COVER_BYTES, name });

export const isUploadedCover = (ref) => typeof ref === 'string' && ref.startsWith(COVER_PATH_PREFIX);

/** Deletes an uploaded cover file. Callers must make sure no book still uses it. */
export const deleteCoverFile = (ref) => deleteImage(ref, { prefix: COVER_PATH_PREFIX, folder: 'covers' });
