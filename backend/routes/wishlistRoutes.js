import { Router } from 'express';
import { param } from 'express-validator';
import { getWishlist, addToWishlist, removeFromWishlist } from '../controllers/wishlistController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = Router();

router.use(authenticate);

const bookIdRule = [param('bookId').isMongoId().withMessage('Invalid book ID')];

router.get('/', getWishlist);
// PUT/DELETE are idempotent, so a double click lands in the same state.
router.put('/:bookId', bookIdRule, validate, addToWishlist);
router.delete('/:bookId', bookIdRule, validate, removeFromWishlist);

export default router;
