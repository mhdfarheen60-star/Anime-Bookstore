import User from '../models/User.js';
import Book from '../models/Book.js';
import { AppError } from '../middleware/errorMiddleware.js';

const BOOK_FIELDS = 'title author coverImage price originalPrice stock isActive series volumeNumber colors glyph category';

// Returns the wishlist as { ids, books }. Books that were deleted or hidden
// since they were saved are left out of `books` (and `ids`).
const loadWishlist = async (userId) => {
  const user = await User.findById(userId)
    .select('wishlist')
    .populate({ path: 'wishlist', select: BOOK_FIELDS, populate: { path: 'category', select: 'name slug' } })
    .lean();
  const books = (user?.wishlist ?? []).filter((book) => book && book.isActive);
  return { ids: books.map((book) => String(book._id)), books };
};

const getWishlist = async (req, res, next) => {
  try {
    res.json({ success: true, data: { wishlist: await loadWishlist(req.user._id) } });
  } catch (error) {
    next(error);
  }
};

const addToWishlist = async (req, res, next) => {
  try {
    const book = await Book.findOne({ _id: req.params.bookId, isActive: true }).select('_id');
    if (!book) return next(new AppError('Book not found', 404));

    await User.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: book._id } });
    res.json({
      success: true,
      message: 'Saved to your wishlist',
      data: { wishlist: await loadWishlist(req.user._id) },
    });
  } catch (error) {
    next(error);
  }
};

const removeFromWishlist = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: req.params.bookId } });
    res.json({
      success: true,
      message: 'Removed from your wishlist',
      data: { wishlist: await loadWishlist(req.user._id) },
    });
  } catch (error) {
    next(error);
  }
};

export { getWishlist, addToWishlist, removeFromWishlist };
