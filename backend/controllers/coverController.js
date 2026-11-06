import { AppError } from '../middleware/errorMiddleware.js';
import { findCoverCandidates } from '../utils/coverLookup.js';
import { saveCoverImage } from '../utils/coverStorage.js';

// GET /api/books/covers/search?title=&author=&isbn=&series=&volumeNumber=
// Returns catalogue candidates with a match assessment. Assigns nothing.
const searchCovers = async (req, res, next) => {
  try {
    const { title, author, isbn, series, volumeNumber } = req.query;
    if (!title && !isbn) {
      return next(new AppError('Enter a title or an ISBN to search for covers', 400));
    }

    const book = {
      title: title ?? '',
      author: author ?? '',
      isbn: isbn ?? '',
      series: series || undefined,
      volumeNumber: volumeNumber !== undefined && volumeNumber !== '' ? Number(volumeNumber) : undefined,
    };

    const { candidates, errors, isbnValid } = await findCoverCandidates(book);

    res.json({
      success: true,
      data: { candidates, errors, isbnValid: book.isbn ? isbnValid : null },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/books/covers/upload  (body: raw image bytes, Content-Type: image/*)
const uploadCover = async (req, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return next(new AppError('No image received. Choose a JPEG, PNG, WebP or GIF file.', 400));
    }
    const coverPath = await saveCoverImage(req.body);
    res.status(201).json({
      success: true,
      message: 'Cover uploaded',
      data: { coverImage: coverPath },
    });
  } catch (error) {
    if (error.statusCode === 400) return next(new AppError(error.message, 400));
    next(error);
  }
};

export { searchCovers, uploadCover };
