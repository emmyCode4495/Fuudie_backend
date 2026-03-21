import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { OrderController } from '../controllers/order.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { ErrorMiddleware } from '../middleware/error.middleware';
import { OrderStatus, PaymentStatus, DeliveryType, PaymentMethod, StoreType } from '../models/order.model';

const router = Router();

// Decode the user from headers on every request (injected by the API gateway)
router.use(AuthMiddleware.extractUser);

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES  —  declared before wildcard /:id routes
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/orders/admin/stats
 * Platform-wide order & revenue dashboard stats.
 * Query: dateFrom, dateTo
 */
router.get(
  '/admin/stats',
  AuthMiddleware.requireAdmin,
  ErrorMiddleware.asyncHandler(OrderController.adminGetPlatformStats)
);

/**
 * GET /api/orders/admin/stats/stores
 * Per-store revenue breakdown (paginated, filterable by storeType).
 * Query: dateFrom, dateTo, storeType, page, limit
 */
router.get(
  '/admin/stats/stores',
  AuthMiddleware.requireAdmin,
  ErrorMiddleware.asyncHandler(OrderController.adminGetRevenueByStore)
);

/**
 * GET /api/orders/admin/orders
 * Full paginated order list — all users, all stores, all statuses.
 * Query: status, paymentStatus, paymentMethod, deliveryType,
 *        customerId, storeId, storeType, driverId,
 *        dateFrom, dateTo, minTotal, maxTotal, page, limit
 */
router.get(
  '/admin/orders',
  AuthMiddleware.requireAdmin,
  ErrorMiddleware.asyncHandler(OrderController.adminGetAllOrders)
);

/**
 * PATCH /api/orders/admin/orders/:id/payment-status
 * Update payment status — e.g. mark as refunded after a dispute.
 * Body: { paymentStatus, reason? }
 */
router.patch(
  '/admin/orders/:id/payment-status',
  AuthMiddleware.requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('paymentStatus')
      .isIn(Object.values(PaymentStatus))
      .withMessage(`paymentStatus must be one of: ${Object.values(PaymentStatus).join(', ')}`),
  ],
  validate,
  ErrorMiddleware.asyncHandler(OrderController.adminUpdatePaymentStatus)
);

/**
 * PATCH /api/orders/admin/orders/:id/force-cancel
 * Cancel any order at any stage except delivered.
 * Body: { reason }  ← required
 */
router.patch(
  '/admin/orders/:id/force-cancel',
  AuthMiddleware.requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('reason').notEmpty().withMessage('Cancellation reason is required'),
  ],
  validate,
  ErrorMiddleware.asyncHandler(OrderController.adminForceCancel)
);

/**
 * PATCH /api/orders/admin/orders/:id/status
 * Override order status freely — admin can move in any direction.
 * Body: { status, restaurantNotes? }
 */
router.patch(
  '/admin/orders/:id/status',
  AuthMiddleware.requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('status')
      .isIn(Object.values(OrderStatus))
      .withMessage(`status must be one of: ${Object.values(OrderStatus).join(', ')}`),
  ],
  validate,
  ErrorMiddleware.asyncHandler(OrderController.updateOrderStatus)
);

// ═════════════════════════════════════════════════════════════════════════════
// AUTHENTICATED USER ROUTES
// ═════════════════════════════════════════════════════════════════════════════

router.use(AuthMiddleware.requireAuth);

/**
 * POST /api/orders
 * Place a new order — works for any store type (food, groceries, pharmacy, shops).
 *
 * Body (food store):
 * {
 *   storeId:        "69bd...",          ← store-service Store _id
 *   items: [{
 *     itemId:       "64ab...",          ← menuItemId from restaurant-service
 *     name:         "Jollof Rice",
 *     price:        2500,
 *     quantity:     2,
 *     variant:      { name: "Large", price: 500 },   ← optional
 *     addOns:       [{ name: "Extra sauce", price: 100 }],
 *     specialInstructions: "No pepper"
 *   }],
 *   deliveryType:    "delivery",
 *   deliveryAddress: { street: "14 Awolowo Rd", city: "Lagos", state: "Lagos", country: "Nigeria" },
 *   paymentMethod:   "cash",
 *   customerNotes:   "Ring the bell"
 * }
 *
 * Body (non-food store — groceries / pharmacy / shops):
 * {
 *   storeId:  "69bd...",
 *   items: [{
 *     itemId:   "69be...",              ← productId from catalog-service
 *     name:     "Vitamin C",
 *     price:    1200,
 *     quantity: 3
 *   }],
 *   deliveryType:    "delivery",
 *   deliveryAddress: { ... },
 *   paymentMethod:   "bank_transfer"
 * }
 */
router.post(
  '/',
  [
    body('storeId').notEmpty().withMessage('storeId is required'),
    body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
    body('items.*.itemId').notEmpty().withMessage('Each item must have an itemId'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Each item must have a quantity ≥ 1'),
    // name and price are NOT accepted from the client — fetched server-side from catalog/restaurant service
    body('deliveryType')
      .isIn(Object.values(DeliveryType))
      .withMessage(`deliveryType must be one of: ${Object.values(DeliveryType).join(', ')}`),
    body('paymentMethod')
      .isIn(Object.values(PaymentMethod))
      .withMessage(`paymentMethod must be one of: ${Object.values(PaymentMethod).join(', ')}`),
    body('deliveryAddress.street')
      .if(body('deliveryType').equals(DeliveryType.DELIVERY))
      .notEmpty()
      .withMessage('deliveryAddress.street is required for delivery orders'),
    body('deliveryAddress.city')
      .if(body('deliveryType').equals(DeliveryType.DELIVERY))
      .notEmpty()
      .withMessage('deliveryAddress.city is required for delivery orders'),
    body('deliveryAddress.state')
      .if(body('deliveryType').equals(DeliveryType.DELIVERY))
      .notEmpty()
      .withMessage('deliveryAddress.state is required for delivery orders'),
    body('deliveryAddress.country')
      .if(body('deliveryType').equals(DeliveryType.DELIVERY))
      .notEmpty()
      .withMessage('deliveryAddress.country is required for delivery orders'),
  ],
  validate,
  ErrorMiddleware.asyncHandler(OrderController.createOrder)
);

/**
 * GET /api/orders/my-orders
 * Logged-in customer's own orders — across all store types.
 * Query: status, storeType, page, limit
 */
router.get(
  '/my-orders',
  [
    query('status')
      .optional()
      .isIn(Object.values(OrderStatus))
      .withMessage('Invalid status filter'),
    query('storeType')
      .optional()
      .isIn(Object.values(StoreType))
      .withMessage('Invalid storeType filter'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  ErrorMiddleware.asyncHandler(OrderController.getCustomerOrders)
);

/**
 * GET /api/orders/store/:storeId
 * All orders for a specific store — for the store owner dashboard.
 * Query: status, page, limit
 */
router.get(
  '/store/:storeId',
  [
    param('storeId').notEmpty().withMessage('storeId is required'),
    query('status')
      .optional()
      .isIn(Object.values(OrderStatus))
      .withMessage('Invalid status filter'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  ErrorMiddleware.asyncHandler(OrderController.getStoreOrders)
);

/**
 * GET /api/orders/store/:storeId/stats
 * Per-store order statistics — for the store owner dashboard.
 */
router.get(
  '/store/:storeId/stats',
  [param('storeId').notEmpty().withMessage('storeId is required')],
  validate,
  ErrorMiddleware.asyncHandler(OrderController.getStoreOrderStats)
);

/**
 * GET /api/orders/:id
 * Single order by ID — accessible to the customer, assigned driver, or admin.
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid order ID')],
  validate,
  ErrorMiddleware.asyncHandler(OrderController.getOrderById)
);

/**
 * PATCH /api/orders/:id/status
 * Update order status — store owner (forward-only) or admin (any direction).
 * Body: { status, restaurantNotes? }
 */
router.patch(
  '/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('status')
      .isIn(Object.values(OrderStatus))
      .withMessage(`status must be one of: ${Object.values(OrderStatus).join(', ')}`),
    body('restaurantNotes').optional().isString(),
  ],
  validate,
  ErrorMiddleware.asyncHandler(OrderController.updateOrderStatus)
);

/**
 * PATCH /api/orders/:id/assign-driver
 * Assign a driver to a ready order.
 * Body: { driverId }
 */
router.patch(
  '/:id/assign-driver',
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('driverId').notEmpty().withMessage('driverId is required'),
  ],
  validate,
  ErrorMiddleware.asyncHandler(OrderController.assignDriver)
);

/**
 * PATCH /api/orders/:id/cancel
 * Cancel an order.
 * Customer: only while status is pending or confirmed.
 * Admin: any stage except delivered (use force-cancel route instead).
 * Body: { reason? }
 */
router.patch(
  '/:id/cancel',
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('reason').optional().isString(),
  ],
  validate,
  ErrorMiddleware.asyncHandler(OrderController.cancelOrder)
);

export default router;