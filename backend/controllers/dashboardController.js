import Book from '../models/Book.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';

const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalBooks,
      totalUsers,
      totalOrders,
      pendingOrders,
      lowStockBooks,
      recentOrders,
      revenueResult,
      bestSellingBooks,
      categoryStats,
    ] = await Promise.all([
      Book.countDocuments({ isActive: true }),
      User.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      // Out-of-stock (0) books are the most urgent case – include them.
      Book.find({ isActive: true, stock: { $lte: 10, $gte: 0 } })
        .select('title stock')
        .sort({ stock: 1 })
        .limit(10)
        .lean(),
      Order.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Order.aggregate([
        { $match: { status: { $in: ['delivered', 'shipped'] }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { status: { $in: ['delivered', 'shipped'] } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.book',
            title: { $first: '$items.title' },
            totalSold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
      ]),
      Category.aggregate([
        {
          $lookup: {
            from: 'books',
            localField: '_id',
            foreignField: 'category',
            as: 'books',
          },
        },
        {
          $project: {
            name: 1,
            slug: 1,
            bookCount: {
              $size: {
                $filter: {
                  input: '$books',
                  cond: '$$this.isActive',
                },
              },
            },
          },
        },
        { $sort: { bookCount: -1 } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    // Sales by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesByDay = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $in: ['delivered', 'shipped'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Sales by week (last 12 weeks)
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const salesByWeek = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveWeeksAgo },
          status: { $in: ['delivered', 'shipped'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-W%U', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Sales by month (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const salesByMonth = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo },
          status: { $in: ['delivered', 'shipped'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalBooks,
          totalUsers,
          totalOrders,
          totalRevenue,
          pendingOrders,
          lowStockCount: lowStockBooks.length,
        },
        lowStockBooks,
        recentOrders,
        bestSellingBooks,
        categoryStats,
        salesByDay,
        salesByWeek,
        salesByMonth,
      },
    });
  } catch (error) {
    next(error);
  }
};

export { getDashboardStats };