import Order from '../models/Order.js';
import User from '../models/User.js';
import { AppError } from '../middleware/errorMiddleware.js';
import escapeRegex from '../utils/escapeRegex.js';

const getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus, search, sort = 'createdAt', order = 'desc', startDate, endDate } = req.query;

    const query = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    
    if (search) {
      const pattern = escapeRegex(search);
      // Orders store the shipping recipient, not the account email, so match
      // the linked user's email separately.
      const matchingUsers = await User.find({ email: { $regex: pattern, $options: 'i' } })
        .select('_id')
        .limit(100)
        .lean();
      query.$or = [
        { orderNumber: { $regex: pattern, $options: 'i' } },
        { 'shippingAddress.name': { $regex: pattern, $options: 'i' } },
        ...(matchingUsers.length ? [{ user: { $in: matchingUsers.map((u) => u._id) } }] : []),
      ];
    }

    const sortOptions = {};
    const allowedSorts = ['createdAt', 'total', 'status', 'orderNumber'];
    const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';
    sortOptions[sortField] = order === 'asc' ? 1 : -1;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalOrders: total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getOrderStats = async (req, res, next) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      confirmedOrders,
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'processing' }),
      Order.countDocuments({ status: 'shipped' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.countDocuments({ status: 'confirmed' }),
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone address')
      .lean();

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];

    if (status && !validStatuses.includes(status)) {
      return next(new AppError('Invalid order status', 400));
    }

    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return next(new AppError('Invalid payment status', 400));
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      }
    }
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: { order: updatedOrder },
    });
  } catch (error) {
    next(error);
  }
};

export { getAllOrders, getOrderById, updateOrderStatus, getOrderStats };