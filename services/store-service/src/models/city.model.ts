import { Schema, model, Document } from 'mongoose';

export interface ICity extends Document {
  name: string;
  slug: string;
  country: string;
  state: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  coverImage: string;
  isActive: boolean;
  storeCount: number;   // denormalised counter — updated by store hooks
  createdAt: Date;
  updatedAt: Date;
}

const citySchema = new Schema<ICity>(
  {
    name: {
      type: String,
      required: [true, 'City name is required'],
      trim: true,
      unique: true,
      maxlength: [100, 'City name must be 100 characters or fewer'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    coordinates: {
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
    },
    coverImage: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    storeCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

citySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

citySchema.index({ slug: 1 });
citySchema.index({ isActive: 1 });
citySchema.index({ country: 1 });

export const City = model<ICity>('City', citySchema);
