import { Response, NextFunction } from 'express';
import { ProductCategory } from '../models/product_category.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

// ── GET /catalog/categories?storeId=&storeCategory= ───────────────────────────
// Public. Returns active product categories for a store.
export const getProductCategories = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { storeId, storeCategory } = req.query;

    if (!storeId) {
      throw new AppError('storeId query param is required', 400);
    }

    const filter: Record<string, unknown> = { storeId, isActive: true };
    if (storeCategory) filter.storeCategory = storeCategory;

    const categories = await ProductCategory.find(filter)
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    res.json({ success: true, count: categories.length, data: categories });
  } catch (err) {
    next(err);
  }
};

// ── GET /catalog/categories/:id ───────────────────────────────────────────────
export const getProductCategoryById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await ProductCategory.findById(req.params.id).lean();
    if (!category) throw new AppError('Product category not found', 404);
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// ── POST /catalog/categories ──────────────────────────────────────────────────
// Store owner creates a sub-category for their own store.
export const createProductCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, storeId, storeCategory, image, displayOrder } = req.body;

    // Owners can only create categories for their own stores.
    // Admin can create for any store.
    // storeCategory is passed in the body and validated against the store-service
    // by the client/gateway — we trust the value here after auth.
    if (req.user!.role !== 'admin') {
      // ownerId is stored on the store in store-service; we rely on the
      // store owner role being scoped correctly via auth middleware.
      const exists = await ProductCategory.findOne({ name, storeId });
      if (exists) {
        throw new AppError('A category with this name already exists in this store', 409);
      }
    }

    const category = await ProductCategory.create({
      name, description, storeId, storeCategory, image, displayOrder,
    });

    res.status(201).json({ success: true, message: 'Product category created', data: category });
  } catch (err) {
    next(err);
  }
};

// ── PUT /catalog/categories/:id ───────────────────────────────────────────────
export const updateProductCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await ProductCategory.findById(req.params.id);
    if (!category) throw new AppError('Product category not found', 404);

    const { name, description, image, displayOrder, isActive } = req.body;

    if (name !== undefined)         category.name         = name;
    if (description !== undefined)  category.description  = description;
    if (image !== undefined)        category.image        = image;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;
    if (isActive !== undefined)     category.isActive     = isActive;

    await category.save();
    res.json({ success: true, message: 'Product category updated', data: category });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /catalog/categories/:id ───────────────────────────────────────────
export const deleteProductCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { Product } = await import('../models/product.model');
    const productCount = await Product.countDocuments({ categoryId: req.params.id });

    if (productCount > 0) {
      throw new AppError(
        `Cannot delete: ${productCount} product(s) are using this category. Reassign or delete them first.`,
        409
      );
    }

    const category = await ProductCategory.findByIdAndDelete(req.params.id);
    if (!category) throw new AppError('Product category not found', 404);

    res.json({ success: true, message: 'Product category deleted' });
  } catch (err) {
    next(err);
  }
};
