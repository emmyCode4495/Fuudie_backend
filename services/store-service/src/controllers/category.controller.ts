import { Request, Response, NextFunction } from 'express';
import { Category } from '../models/category.model';

// ── GET /categories ───────────────────────────────────────────────────────────
// Public. Returns all active categories sorted by displayOrder.
export const getAllCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    res.json({ success: true, count: categories.length, data: categories });
  } catch (err) {
    next(err);
  }
};

// ── GET /categories/all  (admin) ──────────────────────────────────────────────
export const getAllCategoriesAdmin = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await Category.find()
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    res.json({ success: true, count: categories.length, data: categories });
  } catch (err) {
    next(err);
  }
};

// ── GET /categories/:id ───────────────────────────────────────────────────────
export const getCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// ── GET /categories/slug/:slug ────────────────────────────────────────────────
export const getCategoryBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).lean();
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// ── POST /categories  (admin) ─────────────────────────────────────────────────
export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, icon, displayOrder } = req.body;

    const exists = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (exists) {
      res.status(409).json({ success: false, message: 'A category with this name already exists' });
      return;
    }

    const category = await Category.create({ name, description, icon, displayOrder });
    res.status(201).json({ success: true, message: 'Category created', data: category });
  } catch (err) {
    next(err);
  }
};

// ── PUT /categories/:id  (admin) ──────────────────────────────────────────────
export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, icon, displayOrder, isActive } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    if (name && name !== category.name) {
      const duplicate = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: category._id },
      });
      if (duplicate) {
        res.status(409).json({ success: false, message: 'Another category already uses this name' });
        return;
      }
      category.name = name;
    }

    if (description  !== undefined) category.description  = description;
    if (icon         !== undefined) category.icon         = icon;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;
    if (isActive     !== undefined) category.isActive     = isActive;

    await category.save();
    res.json({ success: true, message: 'Category updated', data: category });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /categories/:id  (admin) ───────────────────────────────────────────
export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { Store } = await import('../models/store.model');
    const storeCount = await Store.countDocuments({ category: req.params.id });
    if (storeCount > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete: ${storeCount} store(s) are using this category`,
      });
      return;
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};
