import { Schema, model, Document, Types } from 'mongoose';

/**
 * Product — a single purchasable item in the catalog.
 *
 * Shared by all non-restaurant store types:
 *   - Groceries  (fruit, milk, bread, etc.)
 *   - Pharmacy   (medicines, vitamins, cosmetics, etc.)
 *   - Shops      (clothes, electronics, accessories, etc.)
 *
 * The `storeCategory` field ties each product back to its parent
 * store-service category, allowing the order-service and api-gateway
 * to route queries correctly without joining across services.
 */
export interface IProduct extends Document {
  name: string;
  description: string;

  // ── Store ownership ────────────────────────────────────────────────────────
  storeId: string;          // references store._id in store-service
  ownerId: string;          // references user._id in user-service (denormalised for auth checks)
  storeCategory: 'groceries' | 'pharmacy' | 'shops';
  categoryId: Types.ObjectId;  // → ProductCategory (within this service)

  // ── Pricing ────────────────────────────────────────────────────────────────
  price: number;
  compareAtPrice: number;   // original price before discount, 0 = no discount shown

  // ── Product identity ───────────────────────────────────────────────────────
  sku: string;
  barcode: string;
  unit: string;             // e.g. "kg", "litre", "pack", "bottle", "piece"
  quantity: string;         // human label: "500g", "1L", "12-pack"

  // ── Media ──────────────────────────────────────────────────────────────────
  images: string[];
  thumbnail: string;        // first image, denormalised for list views

  // ── Stock ──────────────────────────────────────────────────────────────────
  inStock: boolean;
  stockCount: number;       // -1 = unlimited / not tracked

  // ── Domain-specific flags ──────────────────────────────────────────────────
  requiresPrescription: boolean;  // pharmacy only
  ageRestricted: boolean;         // alcohol, tobacco etc.

  // ── Discovery ─────────────────────────────────────────────────────────────
  tags: string[];
  isFeatured: boolean;
  isActive: boolean;

  // ── Stats ─────────────────────────────────────────────────────────────────
  totalOrders: number;    // incremented by order-service via internal event/call

  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [150, 'Name must be 150 characters or fewer'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Description must be 1000 characters or fewer'],
    },

    storeId: {
      type: String,
      required: [true, 'Store ID is required'],
      trim: true,
    },
    ownerId: {
      type: String,
      required: [true, 'Owner ID is required'],
      trim: true,
    },
    storeCategory: {
      type: String,
      enum: ['groceries', 'pharmacy', 'shops'],
      required: [true, 'Store category is required'],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductCategory',
      required: [true, 'Product category is required'],
    },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a positive number'],
    },
    compareAtPrice: { type: Number, default: 0, min: 0 },

    sku:      { type: String, default: '', trim: true },
    barcode:  { type: String, default: '', trim: true },
    unit:     { type: String, default: 'piece', trim: true },
    quantity: { type: String, default: '', trim: true },

    images:    { type: [String], default: [] },
    thumbnail: { type: String,   default: '' },

    inStock:    { type: Boolean, default: true },
    stockCount: { type: Number,  default: -1 },   // -1 = unlimited

    requiresPrescription: { type: Boolean, default: false },
    ageRestricted:        { type: Boolean, default: false },

    tags:       { type: [String], default: [] },
    isFeatured: { type: Boolean,  default: false },
    isActive:   { type: Boolean,  default: true  },

    totalOrders: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Auto-set thumbnail from first image
productSchema.pre('save', function (next) {
  if (this.isModified('images') && this.images.length > 0) {
    this.thumbnail = this.images[0];
  }
  next();
});

// Keep ProductCategory.productCount in sync
productSchema.post('save', async function () {
  const { ProductCategory } = await import('./product_category.model');
  const count = await Product.countDocuments({ categoryId: this.categoryId, isActive: true });
  await ProductCategory.findByIdAndUpdate(this.categoryId, { productCount: count });
});

productSchema.post('findOneAndDelete', async function (doc: IProduct | null) {
  if (!doc) return;
  const { ProductCategory } = await import('./product_category.model');
  const count = await Product.countDocuments({ categoryId: doc.categoryId, isActive: true });
  await ProductCategory.findByIdAndUpdate(doc.categoryId, { productCount: count });
});

// ── Indexes ───────────────────────────────────────────────────────────────────
productSchema.index({ storeId: 1, isActive: 1 });
productSchema.index({ storeId: 1, categoryId: 1 });
productSchema.index({ storeCategory: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, totalOrders: -1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

export const Product = model<IProduct>('Product', productSchema);
