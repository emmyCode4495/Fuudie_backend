import { Response, NextFunction } from 'express';
import { Product } from '../models/product.model';
import { ProductCategory } from '../models/product_category.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildFilter = (query: Record<string, unknown>, extraFilter: Record<string, unknown> = {}) => {
  const filter: Record<string, unknown> = { ...extraFilter };

  if (query.storeId)        filter.storeId       = query.storeId;
  if (query.storeCategory)  filter.storeCategory = query.storeCategory;
  if (query.categoryId)     filter.categoryId    = query.categoryId;
  if (query.inStock === 'true')    filter.inStock    = true;
  if (query.featured === 'true')   filter.isFeatured = true;
  if (query.prescription === 'true')  filter.requiresPrescription = true;
  if (query.ageRestricted === 'true') filter.ageRestricted        = true;

  if (query.minPrice || query.maxPrice) {
    const priceFilter: Record<string, number> = {};
    if (query.minPrice) priceFilter.$gte = parseFloat(query.minPrice as string);
    if (query.maxPrice) priceFilter.$lte = parseFloat(query.maxPrice as string);
    filter.price = priceFilter;
  }

  if (query.search) {
    filter.$text = { $search: query.search as string };
  }

  return filter;
};

// ── GET /catalog/products ─────────────────────────────────────────────────────
// Public. Supports ?storeId=&storeCategory=&categoryId=&search=&inStock=
//         &featured=&minPrice=&maxPrice=&page=&limit=
export const getProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip  = (page - 1) * limit;

    const filter = buildFilter(req.query as Record<string, unknown>, { isActive: true });

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name displayOrder')
        .sort({ isFeatured: -1, totalOrders: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /catalog/products/admin ───────────────────────────────────────────────
export const getProductsAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip  = (page - 1) * limit;

    const filter = buildFilter(req.query as Record<string, unknown>);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name displayOrder')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /catalog/products/:id ─────────────────────────────────────────────────
export const getProductById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name description displayOrder')
      .lean();

    if (!product) throw new AppError('Product not found', 404);

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// ── GET /catalog/products/store/:storeId ──────────────────────────────────────
// Returns all active products for a store, grouped by category.
export const getProductsByStore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { categoryId } = req.query;

    const filter: Record<string, unknown> = { storeId, isActive: true };
    if (categoryId) filter.categoryId = categoryId;

    const products = await Product.find(filter)
      .populate('categoryId', 'name displayOrder')
      .sort({ 'categoryId.displayOrder': 1, isFeatured: -1, name: 1 })
      .lean();

    // Group by category for a structured response
    const grouped: Record<string, { category: unknown; products: unknown[] }> = {};
    products.forEach((p: any) => {
      const catId  = p.categoryId?._id?.toString() || 'uncategorised';
      const catName = p.categoryId?.name || 'Uncategorised';
      if (!grouped[catId]) grouped[catId] = { category: p.categoryId, products: [] };
      grouped[catId].products.push(p);
    });

    res.json({
      success: true,
      storeId,
      totalProducts: products.length,
      data: Object.values(grouped),
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /catalog/products/me ──────────────────────────────────────────────────
// Returns all products owned by the authenticated store owner.
export const getMyProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip  = (page - 1) * limit;

    const filter: Record<string, unknown> = { ownerId: req.user!.id };
    if (req.query.storeId) filter.storeId = req.query.storeId;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name displayOrder')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /catalog/products ────────────────────────────────────────────────────
export const createProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name, description,
      storeId, storeCategory, categoryId,
      price, compareAtPrice,
      sku, barcode, unit, quantity,
      images, inStock, stockCount,
      requiresPrescription, ageRestricted,
      tags,
    } = req.body;

    // Verify product category belongs to the same store
    const cat = await ProductCategory.findById(categoryId);
    if (!cat || !cat.isActive) {
      throw new AppError('Product category not found or is inactive', 422);
    }
    if (cat.storeId !== storeId) {
      throw new AppError('Product category does not belong to this store', 422);
    }

    const product = await Product.create({
      name, description,
      storeId,
      ownerId: req.user!.id,
      storeCategory,
      categoryId,
      price, compareAtPrice,
      sku, barcode, unit, quantity,
      images, inStock, stockCount,
      requiresPrescription, ageRestricted,
      tags,
    });

    await product.populate('categoryId', 'name displayOrder');

    res.status(201).json({ success: true, message: 'Product created', data: product });
  } catch (err) {
    next(err);
  }
};

// ── PUT /catalog/products/:id ─────────────────────────────────────────────────
export const updateProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    // Only the owner or admin can update
    if (req.user!.role !== 'admin' && product.ownerId !== req.user!.id) {
      throw new AppError('You do not own this product', 403);
    }

    // If changing category, verify it belongs to the same store
    if (req.body.categoryId && req.body.categoryId !== String(product.categoryId)) {
      const cat = await ProductCategory.findById(req.body.categoryId);
      if (!cat || !cat.isActive) throw new AppError('Product category not found or inactive', 422);
      if (cat.storeId !== product.storeId) {
        throw new AppError('Product category does not belong to this store', 422);
      }
      product.categoryId = req.body.categoryId;
    }

    const updatable = [
      'name', 'description', 'price', 'compareAtPrice',
      'sku', 'barcode', 'unit', 'quantity', 'images',
      'inStock', 'stockCount', 'requiresPrescription',
      'ageRestricted', 'tags',
    ] as const;

    updatable.forEach((field) => {
      if (req.body[field] !== undefined) (product as any)[field] = req.body[field];
    });

    // Admin-only fields
    if (req.user!.role === 'admin') {
      if (req.body.isFeatured !== undefined) product.isFeatured = req.body.isFeatured;
      if (req.body.isActive   !== undefined) product.isActive   = req.body.isActive;
    }

    await product.save();
    await product.populate('categoryId', 'name displayOrder');

    res.json({ success: true, message: 'Product updated', data: product });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /catalog/products/:id/stock ─────────────────────────────────────────
// Lightweight stock toggle — used by store owners from dashboard.
export const updateProductStock = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { inStock, stockCount } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    if (req.user!.role !== 'admin' && product.ownerId !== req.user!.id) {
      throw new AppError('You do not own this product', 403);
    }

    if (inStock    !== undefined) product.inStock    = inStock;
    if (stockCount !== undefined) product.stockCount = stockCount;

    await product.save();
    res.json({ success: true, message: 'Stock updated', data: { inStock: product.inStock, stockCount: product.stockCount } });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /catalog/products/order-update ─────────────────────────────────────
// Internal endpoint — called by order-service after a successful order
// to increment totalOrders and optionally decrement stockCount.
export const recordOrderUpdate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { items } = req.body as {
      items: { productId: string; quantity: number }[];
    };

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('items array is required', 400);
    }

    await Promise.all(
      items.map(({ productId, quantity }) =>
        Product.findByIdAndUpdate(productId, {
          $inc: { totalOrders: 1, ...(quantity ? { stockCount: -quantity } : {}) },
        })
      )
    );

    res.json({ success: true, message: 'Order stats updated' });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /catalog/products/:id ──────────────────────────────────────────────
export const deleteProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    if (req.user!.role !== 'admin' && product.ownerId !== req.user!.id) {
      throw new AppError('You do not own this product', 403);
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};
