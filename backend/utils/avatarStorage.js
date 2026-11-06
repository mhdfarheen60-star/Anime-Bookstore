// Local disk storage for user-uploaded profile pictures.
// Files live in backend/uploads/avatars and are served at /uploads/avatars/<file>.
// The database stores only that path, never the image bytes.

import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { UPLOADS_DIR, detectImageType } from './coverStorage.js';

const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
export const AVATAR_PATH_PREFIX = '/uploads/avatars/';
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Saves an uploaded image buffer under a fresh unique name and returns its public path. */
export const saveAvatarImage = async (buffer) => {
  const ext = detectImageType(buffer);
  if (!ext) {
    const error = new Error('Unsupported image. Upload a JPEG, PNG, WebP or GIF file.');
    error.statusCode = 400;
    throw error;
  }
  await mkdir(AVATARS_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(AVATARS_DIR, filename), buffer);
  return `${AVATAR_PATH_PREFIX}${filename}`;
};

export const isUploadedAvatar = (ref) => typeof ref === 'string' && ref.startsWith(AVATAR_PATH_PREFIX);

/** Deletes an uploaded avatar file. Each file belongs to exactly one user. */
export const deleteAvatarFile = async (ref) => {
  if (!isUploadedAvatar(ref)) return;
  const filename = path.basename(ref);
  try {
    await unlink(path.join(AVATARS_DIR, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not delete avatar file:', error.message);
  }
};
