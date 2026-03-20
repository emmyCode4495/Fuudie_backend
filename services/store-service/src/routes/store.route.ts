

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getAllStores,
  getAllStoresAdmin,
  getStoreById,
  getStoreBySlug,
  getStoresByCity,
  getStoresByCityAndCategory,
  getMyStores,
  createStore,
  updateStore,
  updateStoreStatus,
  deleteStore,
} from '../controllers/store.controller';
import { authenticate, requireAdmin, requireOwnerOrAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { ErrorMiddleware } from '../middleware/error.middleware';

const router = Router();

const openingHourRules = () =>
  body('openingHours').optional().isArray().withMessage('openingHours must be an array');

// ── Public ────────────────────────────────────────────────────────────────────

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  ErrorMiddleware.asyncHandler(getAllStores)
);

router.get('/slug/:slug',   ErrorMiddleware.asyncHandler(getStoreBySlug));
router.get('/me/stores',    authenticate, ErrorMiddleware.asyncHandler(getMyStores));

// All active stores in a city (optionally filtered by ?category=<id>)
router.get(
  '/city/:cityId',
  [param('cityId').isMongoId().withMessage('Invalid city ID')],
  validate,
  ErrorMiddleware.asyncHandler(getStoresByCity)
);

// ── NEW: stores in a city filtered by a specific category ─────────────────────
// GET /stores/city/:cityId/category/:categoryId
// e.g. GET /stores/city/664b.../category/664a...
//      → returns all active "Food" stores in "Lagos"
router.get(
  '/city/:cityId/category/:categoryId',
  [
    param('cityId').isMongoId().withMessage('Invalid city ID'),
    param('categoryId').isMongoId().withMessage('Invalid category ID'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('featured').optional().isBoolean(),
    query('search').optional().isString(),
  ],
  validate,
  ErrorMiddleware.asyncHandler(getStoresByCityAndCategory)
);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid store ID')],
  validate,
  ErrorMiddleware.asyncHandler(getStoreById)
);

// ── Authenticated ─────────────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  requireOwnerOrAdmin,
  [
    body('name').trim().notEmpty().withMessage('Store name is required').isLength({ max: 120 }),
    body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 1000 }),
    body('category').isMongoId().withMessage('A valid category ID is required'),
    body('city').isMongoId().withMessage('A valid city ID is required'),
    body('phone').optional().trim(),
    body('email').optional().isEmail().withMessage('Email must be valid').normalizeEmail(),
    body('website').optional().isURL().withMessage('Website must be a valid URL'),
    body('logo').optional().isURL(),
    body('coverImage').optional().isURL(),
    body('address').optional().isObject(),
    body('coordinates.latitude').optional().isFloat({ min: -90, max: 90 }),
    body('coordinates.longitude').optional().isFloat({ min: -180, max: 180 }),
    body('preparationTime').optional().isInt({ min: 1 }),
    body('deliveryRadius').optional().isFloat({ min: 0 }),
    body('minimumOrder').optional().isFloat({ min: 0 }),
    body('deliveryFee').optional().isFloat({ min: 0 }),
    openingHourRules(),
  ],
  validate,
  ErrorMiddleware.asyncHandler(createStore)
);

router.put(
  '/:id',
  authenticate,
  requireOwnerOrAdmin,
  [
    param('id').isMongoId().withMessage('Invalid store ID'),
    body('name').optional().trim().isLength({ max: 120 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('category').optional().isMongoId(),
    body('city').optional().isMongoId(),
    body('email').optional().isEmail().normalizeEmail(),
    body('website').optional().isURL(),
    body('logo').optional().isURL(),
    body('coverImage').optional().isURL(),
    body('preparationTime').optional().isInt({ min: 1 }),
    body('deliveryRadius').optional().isFloat({ min: 0 }),
    body('minimumOrder').optional().isFloat({ min: 0 }),
    body('deliveryFee').optional().isFloat({ min: 0 }),
    openingHourRules(),
  ],
  validate,
  ErrorMiddleware.asyncHandler(updateStore)
);

router.delete(
  '/:id',
  authenticate,
  requireOwnerOrAdmin,
  [param('id').isMongoId().withMessage('Invalid store ID')],
  validate,
  ErrorMiddleware.asyncHandler(deleteStore)
);

// ── Admin ─────────────────────────────────────────────────────────────────────

router.get(
  '/admin/all',
  authenticate,
  requireAdmin,
  ErrorMiddleware.asyncHandler(getAllStoresAdmin)
);

router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid store ID'),
    body('status')
      .isIn(['pending', 'active', 'suspended', 'closed'])
      .withMessage('Status must be one of: pending, active, suspended, closed'),
  ],
  validate,
  ErrorMiddleware.asyncHandler(updateStoreStatus)
);

export default router;
