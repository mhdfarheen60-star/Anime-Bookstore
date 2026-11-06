import User from '../models/User.js';
import Order from '../models/Order.js';
import { AppError } from '../middleware/errorMiddleware.js';
import escapeRegex from '../utils/escapeRegex.js';

const getUserStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      customerAccounts,
      adminAccounts,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        customerAccounts,
        adminAccounts,
        recentUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, isActive } = req.query;

    const query = {};
    if (search) {
      const pattern = escapeRegex(search);
      query.$or = [
        { name: { $regex: pattern, $options: 'i' } },
        { email: { $regex: pattern, $options: 'i' } },
      ];
    }
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalUsers: total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const orderCount = await Order.countDocuments({ user: user._id });
    const totalSpent = await Order.aggregate([
      { $match: { user: user._id, status: { $in: ['delivered', 'shipped'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    res.json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          orderCount,
          totalSpent: totalSpent[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, phone, address, isActive, role } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent demoting the last admin
    if (user.role === 'admin' && role === 'customer') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return next(new AppError('Cannot demote the last active admin', 400));
      }
    }

    // Prevent self-demotion
    if (req.user._id.toString() === user._id.toString() && role === 'customer') {
      return next(new AppError('You cannot change your own role', 400));
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role !== undefined) updateData.role = role;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

const getUserOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find({ user: req.params.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments({ user: req.params.id }),
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

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return next(new AppError('Cannot delete the last active admin', 400));
      }
    }

    // Prevent self-deletion
    if (req.user._id.toString() === user._id.toString()) {
      return next(new AppError('You cannot delete your own account', 400));
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export { getAllUsers, getUserById, updateUser, getUserOrders, deleteUser, getUserStats };