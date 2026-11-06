import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Book from '../models/Book.js';
import { AppError } from '../middleware/errorMiddleware.js';

// Books belong to a shelf either through their primary category or through a
// merchandising tag (Bestsellers, Preorders, Box Sets, ...).
const booksInCategory = (category) => ({
  isActive: true,
  $or: [{ category: category._id }, { tags: category.name }],
});

const getAllCategories = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    // Inactive categories are only visible to admins; everyone else gets active ones.
    const showAll = includeInactive === 'true' && req.user?.role === 'admin';
    const query = showAll ? {} : { isActive: true };

    const categories = await Category.find(query)
      .sort({ name: 1 })
      .lean();

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const bookCount = await Book.countDocuments(booksInCategory(cat));
        return { ...cat, bookCount };
      })
    );

    res.json({
      success: true,
      data: { categories: categoriesWithCount },
    });
  } catch (error) {
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    // Only try the _id branch for real ObjectIds; a slug there makes Mongoose throw.
    const { id } = req.params;
    const category = await Category.findOne(
      mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { slug: id }] } : { slug: id }
    );

    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    const bookCount = await Book.countDocuments(booksInCategory(category));

    res.json({
      success: true,
      data: {
        category: {
          ...category.toObject(),
          bookCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description, image, isActive } = req.body;

    const category = await Category.create({
      name,
      description,
      image,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name, description, image, isActive } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await Category.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    const bookCount = await Book.countDocuments({
      $or: [{ category: category._id }, { tags: category.name }],
    });
    if (bookCount > 0) {
      return next(
        new AppError(`Cannot delete category. ${bookCount} book(s) are assigned to it.`, 400)
      );
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory };