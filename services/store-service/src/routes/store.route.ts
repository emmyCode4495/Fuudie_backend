import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getAllStores,
  getAllStoresAdmin,
  getStoreById,
  getStoreBySlug,
  getStoresByCity,
  getMyStores,
  createStore,
  updateStore,
  updateStoreStatus,
  deleteStore,
} from '../controllers/store.controller';
import { authenticate, requireAdmin, requireOwnerOrAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

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
  getAllStores
);

router.get('/slug/:slug',         getStoreBySlug);
router.get('/city/:cityId',       getStoresByCity);
router.get('/:id',                getStoreById);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.get('/me/stores', authenticate, getMyStores);

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
    body('coordinates.latitude').optional().isFloat({ min: -90,  max: 90  }),
    body('coordinates.longitude').optional().isFloat({ min: -180, max: 180 }),
    body('preparationTime').optional().isInt({ min: 1 }),
    body('deliveryRadius').optional().isFloat({ min: 0 }),
    body('minimumOrder').optional().isFloat({ min: 0 }),
    body('deliveryFee').optional().isFloat({ min: 0 }),
    openingHourRules(),
  ],
  validate,
  createStore
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
  updateStore
);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/all', authenticate, requireAdmin, getAllStoresAdmin);

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
  updateStoreStatus
);

router.delete(
  '/:id',
  authenticate,
  requireOwnerOrAdmin,
  [param('id').isMongoId().withMessage('Invalid store ID')],
  validate,
  deleteStore
);

export default router;
