// Shared helpers for storing admin-uploaded images on local disk.
//
// Files live in backend/uploads/<folder> and are served by the Express static
// middleware at /uploads/<folder>/<file>. The database stores only that path,
// never the image bytes.

import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const UPLOADS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');

// Identify the format from the file's magic bytes rather than trusting the
// client's Content-Type header.
export const detectImageType = (buf) => {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buf.subarray(0, 6).toString('ascii').startsWith('GIF8')) return 'gif';
  return null;
};

/**
 * Saves an image buffer under a fresh unique name (or a stable `name` when one is
 * supplied, used for reviewed catalogue covers that are cached locally).
 * @param {Buffer} buffer raw file bytes
 * @param {{ folder: string, prefix: string, maxBytes: number, name?: string }} options
 * @returns {Promise<string>} the public path, e.g. "/uploads/covers/<file>"
 */
export const saveImage = async (buffer, { folder, prefix, maxBytes, name }) => {
  if (!buffer || !buffer.length) {
    const error = new Error('No image was uploaded.');
    error.statusCode = 400;
    throw error;
  }
  if (buffer.length > maxBytes) {
    const error = new Error('Image is too large.');
    error.statusCode = 400;
    throw error;
  }
  const ext = detectImageType(buffer);
  if (!ext) {
    const error = new Error('Unsupported image. Upload a JPEG, PNG, WebP or GIF file.');
    error.statusCode = 400;
    throw error;
  }
  const dir = path.join(UPLOADS_ROOT, folder);
  await mkdir(dir, { recursive: true });
  const safeName = typeof name === 'string' ? name.trim().replace(/[^a-zA-Z0-9._-]+/g, '-') : '';
  const filename = `${safeName || randomUUID()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  return `${prefix}${filename}`;
};

/** Deletes a stored image file. Callers must make sure nothing references it. */
export const deleteImage = async (ref, { prefix, folder }) => {
  if (typeof ref !== 'string' || !ref.startsWith(prefix)) return;
  const filename = path.basename(ref);
  try {
    await unlink(path.join(UPLOADS_ROOT, folder, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not delete image file:', error.message);
  }
};
