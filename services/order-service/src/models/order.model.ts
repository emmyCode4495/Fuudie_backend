import mongoose, { Document, Schema, Types } from 'mongoose';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum OrderStatus {
  PENDING          = 'pending',
  CONFIRMED        = 'confirmed',
  PREPARING        = 'preparing',
  READY            = 'ready',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED        = 'delivered',
  CANCELLED        = 'cancelled',
}

export enum PaymentStatus {
  PENDING  = 'pending',
  PAID     = 'paid',
  FAILED   = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CREDIT_CARD  = 'credit_card',
  DEBIT_CARD   = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  CASH         = 'cash',
  WALLET       = 'wallet',
}

export enum DeliveryType {
  DELIVERY = 'delivery',
  PICKUP   = 'pickup',
}

/**
 * Which microservice owns the items in this order.
 * - "restaurant-service" → food menu items (variants, add-ons)
 * - "catalog-service"    → products (groceries, pharmacy, shops)
 */
export enum ItemSource {
  RESTAURANT_SERVICE = 'restaurant-service',
  CATALOG_SERVICE    = 'catalog-service',
}

/**
 * Top-level store category slug from store-service.
 * Mirrors the slugs seeded into the Category model there.
 */
export enum StoreType {
  FOOD             = 'food',
  GROCERIES        = 'groceries',
  PHARMACY_BEAUTY  = 'pharmacy-beauty',
  SHOPS            = 'shops',
  PACKAGE_DELIVERY = 'package-delivery',
}

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface IOrderItem {
  _id?: Types.ObjectId;

  /**
   * The ID of the item in its source service:
   *  - menuItemId  when itemSource === "restaurant-service"
   *  - productId   when itemSource === "catalog-service"
   */
  itemId: string;

  /** Which microservice owns this item — used to route re-validation calls */
  itemSource: ItemSource;

  name: string;
  price: number;
  quantity: number;

  /** Only applicable for food orders */
  variant?: {
    name: string;
    price: number;
  };

  /** Only applicable for food orders */
  addOns: Array<{
    name: string;
    price: number;
  }>;

  specialInstructions?: string;
  subtotal: number;
}

export interface IDeliveryAddress {
  street:      string;
  apartment?:  string;
  landmark?:   string;
  city:        string;
  state:       string;
  country:     string;
  postalCode?: string;
  coordinates?: {
    latitude:  number;
    longitude: number;
  };
  instructions?: string;
}

// ─── Main order interface ─────────────────────────────────────────────────────

export interface IOrder extends Document {
  orderNumber: string;

  // ── Who / what ──────────────────────────────────────────────────────────────
  customerId: string;    // ObjectId string from user-service

  /**
   * storeId is the MongoDB _id of the Store document in store-service.
   * This is the single source of truth regardless of whether the store
   * is a restaurant, grocery, pharmacy, or shop.
   */
  storeId:   string;

  /**
   * Denormalised slug of the store's top-level category.
   * Lets the order service skip a service call when routing logic
   * needs to know whether to talk to restaurant-service or catalog-service.
   */
  storeType: StoreType;

  /** Friendly store name — denormalised so we don't need a lookup to display orders */
  storeName: string;

  items: IOrderItem[];

  // ── Pricing ─────────────────────────────────────────────────────────────────
  subtotal:    number;
  deliveryFee: number;
  tax:         number;
  discount:    number;
  total:       number;

  // ── Delivery ─────────────────────────────────────────────────────────────────
  deliveryType:     DeliveryType;
  deliveryAddress?: IDeliveryAddress;
  driverId?:        string;

  // ── Status ───────────────────────────────────────────────────────────────────
  status:        OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;

  // ── Notes ────────────────────────────────────────────────────────────────────
  customerNotes?:    string;
  restaurantNotes?:  string;   // kept as "restaurantNotes" for UI compatibility

  // ── Timestamps ───────────────────────────────────────────────────────────────
  estimatedDeliveryTime?: Date;
  confirmedAt?:           Date;
  preparingAt?:           Date;
  readyAt?:               Date;
  outForDeliveryAt?:      Date;
  deliveredAt?:           Date;
  cancelledAt?:           Date;
  cancellationReason?:    string;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const orderItemSchema = new Schema<IOrderItem>({
  itemId: {
    type:     String,
    required: true,
    comment:  'menuItemId (restaurant-service) or productId (catalog-service)',
  },
  itemSource: {
    type:     String,
    enum:     Object.values(ItemSource),
    required: true,
  },
  name:     { type: String, required: true },
  price:    { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  variant: {
    name:  String,
    price: Number,
  },
  addOns: [{
    name:  String,
    price: Number,
  }],
  specialInstructions: String,
  subtotal: { type: Number, required: true, min: 0 },
});

const deliveryAddressSchema = new Schema<IDeliveryAddress>({
  street:     { type: String, required: true },
  apartment:  String,
  landmark:   String,
  city:       { type: String, required: true },
  state:      { type: String, required: true },
  country:    { type: String, required: true },
  postalCode: String,
  coordinates: {
    latitude:  Number,
    longitude: Number,
  },
  instructions: String,
});

// ─── Helper ───────────────────────────────────────────────────────────────────

const generateOrderNumber = (): string =>
  `FUD-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

// ─── Main schema ──────────────────────────────────────────────────────────────

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type:    String,
      unique:  true,
      default: generateOrderNumber,
    },

    customerId: { type: String, required: true, index: true },
    storeId:    { type: String, required: true, index: true },
    storeType: {
      type:     String,
      enum:     Object.values(StoreType),
      required: true,
    },
    storeName: { type: String, required: true },

    items: {
      type:     [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message:   'Order must contain at least one item',
      },
    },

    subtotal:    { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    tax:         { type: Number, required: true, min: 0 },
    discount:    { type: Number, default: 0,     min: 0 },
    total:       { type: Number, required: true, min: 0 },

    deliveryType: {
      type:     String,
      enum:     Object.values(DeliveryType),
      required: true,
    },
    deliveryAddress: deliveryAddressSchema,
    driverId:        { type: String },

    status: {
      type:    String,
      enum:    Object.values(OrderStatus),
      default: OrderStatus.PENDING,
    },
    paymentStatus: {
      type:    String,
      enum:    Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    paymentMethod: {
      type:     String,
      enum:     Object.values(PaymentMethod),
      required: true,
    },

    customerNotes:   String,
    restaurantNotes: String,

    estimatedDeliveryTime: Date,
    confirmedAt:           Date,
    preparingAt:           Date,
    readyAt:               Date,
    outForDeliveryAt:      Date,
    deliveredAt:           Date,
    cancelledAt:           Date,
    cancellationReason:    String,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.__v = 0;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

orderSchema.index({ orderNumber:  1 });
orderSchema.index({ customerId:   1, createdAt: -1 });
orderSchema.index({ storeId:      1, status: 1 });
orderSchema.index({ storeId:      1, createdAt: -1 });
orderSchema.index({ driverId:     1, status: 1 });
orderSchema.index({ status:       1, createdAt: -1 });
orderSchema.index({ storeType:    1, createdAt: -1 });

// ─── Hooks ────────────────────────────────────────────────────────────────────

orderSchema.pre('validate', function (next) {
  if (!this.orderNumber) this.orderNumber = generateOrderNumber();
  next();
});

// ─── Model ────────────────────────────────────────────────────────────────────

export const Order = mongoose.model<IOrder>('Order', orderSchema);