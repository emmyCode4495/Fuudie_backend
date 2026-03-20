import { Schema, model, Document, Types } from 'mongoose';

export type StoreStatus = 'pending' | 'active' | 'suspended' | 'closed';

export interface IOpeningHour {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isOpen: boolean;
  openTime: string;   // "09:00"
  closeTime: string;  // "22:00"
}

export interface IStore extends Document {
  name: string;
  slug: string;
  description: string;

  // ── Relations ──────────────────────────────────────────────────────────────
  category: Types.ObjectId;   // → Category
  city: Types.ObjectId;       // → City

  // ── Owner (resolves to a user in the user-service) ─────────────────────────
  ownerId: string;

  // ── Contact & location ─────────────────────────────────────────────────────
  address: {
    street: string;
    district: string;
    postalCode: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  phone: string;
  email: string;
  website: string;

  // ── Media ──────────────────────────────────────────────────────────────────
  logo: string;
  coverImage: string;

  // ── Business metadata ──────────────────────────────────────────────────────
  openingHours: IOpeningHour[];
  preparationTime: number;    // minutes
  deliveryRadius: number;     // km
  minimumOrder: number;       // currency units
  deliveryFee: number;

  // ── Stats (denormalised) ───────────────────────────────────────────────────
  rating: number;
  totalRatings: number;
  totalOrders: number;

  // ── Status flags ───────────────────────────────────────────────────────────
  status: StoreStatus;
  isVerified: boolean;
  isFeatured: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const openingHourSchema = new Schema<IOpeningHour>(
  {
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    isOpen:    { type: Boolean, default: true },
    openTime:  { type: String, default: '09:00' },
    closeTime: { type: String, default: '22:00' },
  },
  { _id: false }
);

const storeSchema = new Schema<IStore>(
  {
    name: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
      maxlength: [120, 'Store name must be 120 characters or fewer'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Store description is required'],
      trim: true,
      maxlength: [1000, 'Description must be 1000 characters or fewer'],
    },

    // Relations
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Store must belong to a category'],
    },
    city: {
      type: Schema.Types.ObjectId,
      ref: 'City',
      required: [true, 'Store must be assigned to a city'],
    },

    ownerId: {
      type: String,
      required: [true, 'Owner ID (from user-service) is required'],
      trim: true,
    },

    address: {
      street:     { type: String, default: '' },
      district:   { type: String, default: '' },
      postalCode: { type: String, default: '' },
    },
    coordinates: {
      latitude:  { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
    },

    phone:   { type: String, default: '', trim: true },
    email:   { type: String, default: '', trim: true, lowercase: true },
    website: { type: String, default: '' },

    logo:       { type: String, default: '' },
    coverImage: { type: String, default: '' },

    openingHours:     { type: [openingHourSchema], default: [] },
    preparationTime:  { type: Number, default: 30 },
    deliveryRadius:   { type: Number, default: 5 },
    minimumOrder:     { type: Number, default: 0 },
    deliveryFee:      { type: Number, default: 0 },

    rating:       { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    totalOrders:  { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'closed'],
      default: 'pending',
    },
    isVerified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Slug generation ───────────────────────────────────────────────────────────
storeSchema.pre('save', async function (next) {
  if (!this.isModified('name')) return next();

  const base = this.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Ensure uniqueness by appending a short suffix when needed
  let slug = base;
  let count = 0;
  while (await Store.exists({ slug, _id: { $ne: this._id } })) {
    count++;
    slug = `${base}-${count}`;
  }
  this.slug = slug;
  next();
});

// ── Keep City.storeCount in sync ──────────────────────────────────────────────
storeSchema.post('save', async function () {
  const { City } = await import('./city.model');
  const count = await Store.countDocuments({ city: this.city, status: { $ne: 'closed' } });
  await City.findByIdAndUpdate(this.city, { storeCount: count });
});

storeSchema.post('findOneAndDelete', async function (doc: IStore | null) {
  if (!doc) return;
  const { City } = await import('./city.model');
  const count = await Store.countDocuments({ city: doc.city, status: { $ne: 'closed' } });
  await City.findByIdAndUpdate(doc.city, { storeCount: count });
});

// ── Indexes ───────────────────────────────────────────────────────────────────
storeSchema.index({ slug: 1 });
storeSchema.index({ city: 1, category: 1 });
storeSchema.index({ city: 1, status: 1 });
storeSchema.index({ category: 1, status: 1 });
storeSchema.index({ ownerId: 1 });
storeSchema.index({ isFeatured: 1, rating: -1 });

export const Store = model<IStore>('Store', storeSchema);
