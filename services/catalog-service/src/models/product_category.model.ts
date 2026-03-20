import { Schema, model, Document, Types } from 'mongoose';

/**
 * ProductCategory — sub-categories that belong to a specific store.
 *
 * Example: a pharmacy store might have:
 *   "Vitamins & Supplements", "Pain Relief", "Skincare", "Baby Care"
 *
 * These are distinct from the top-level store-service categories (Groceries,
 * Pharmacy, Shops). Those determine WHICH service owns the store's products;
 * these organize the products WITHIN that store.
 */
export interface IProductCategory extends Document {
  name: string;
  description: string;
  storeId: string;          // references store._id in store-service (stored as string — cross-service)
  storeCategory: 'groceries' | 'pharmacy' | 'shops'; // mirrors store-service category slug
  image: string;
  displayOrder: number;
  isActive: boolean;
  productCount: number;     // denormalised — updated by product hooks
  createdAt: Date;
  updatedAt: Date;
}

const productCategorySchema = new Schema<IProductCategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [80, 'Name must be 80 characters or fewer'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'Description must be 300 characters or fewer'],
    },
    storeId: {
      type: String,
      required: [true, 'Store ID is required'],
      trim: true,
    },
    storeCategory: {
      type: String,
      enum: ['groceries', 'pharmacy', 'shops'],
      required: [true, 'Store category is required'],
    },
    image: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    productCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productCategorySchema.index({ storeId: 1, isActive: 1, displayOrder: 1 });
productCategorySchema.index({ storeCategory: 1 });

export const ProductCategory = model<IProductCategory>('ProductCategory', productCategorySchema);
