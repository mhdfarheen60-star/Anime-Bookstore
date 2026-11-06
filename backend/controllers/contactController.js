import ContactMessage from '../models/ContactMessage.js';
import { AppError } from '../middleware/errorMiddleware.js';

// POST /api/contact  (public)
const createMessage = async (req, res, next) => {
  try {
    const { name, email, message } = req.body;
    const created = await ContactMessage.create({ name, email, message });

    res.status(201).json({
      success: true,
      message: 'Thanks! Your message has been received. We will get back to you soon.',
      data: { id: created._id },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/contact-messages  (admin)
const listMessages = async (req, res, next) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status === 'unread') query.isRead = false;
    else if (status === 'read') query.isRead = true;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [messages, total, unreadCount] = await Promise.all([
      ContactMessage.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      ContactMessage.countDocuments(query),
      ContactMessage.countDocuments({ isRead: false }),
    ]);

    res.json({
      success: true,
      data: {
        messages,
        unreadCount,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalMessages: total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/contact-messages/unread-count  (admin)
const unreadCount = async (req, res, next) => {
  try {
    const count = await ContactMessage.countDocuments({ isRead: false });
    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/contact-messages/:id/read  (admin)
const markMessageRead = async (req, res, next) => {
  try {
    const { isRead = true } = req.body;
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { isRead: Boolean(isRead) },
      { new: true, runValidators: true }
    );
    if (!message) {
      return next(new AppError('Message not found', 404));
    }
    res.json({ success: true, data: { message } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/contact-messages/:id  (admin)
const deleteMessage = async (req, res, next) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) {
      return next(new AppError('Message not found', 404));
    }
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    next(error);
  }
};

export { createMessage, listMessages, markMessageRead, deleteMessage, unreadCount };
