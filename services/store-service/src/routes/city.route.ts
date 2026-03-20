import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getAllCities,
  getAllCitiesAdmin,
  getCityById,
  getCityBySlug,
  getCityCategories,
  createCity,
  updateCity,
  deleteCity,
} from '../controllers/city.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', [query('country').optional().isString()], validate, getAllCities);
router.get('/slug/:slug',          getCityBySlug);
router.get('/:id/categories',      getCityCategories);
router.get('/:id',                 getCityById);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/all', authenticate, requireAdmin, getAllCitiesAdmin);

router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('City name is required').isLength({ max: 100 }),
    body('country').trim().notEmpty().withMessage('Country is required'),
    body('state').optional().trim(),
    body('coordinates.latitude').optional().isFloat({ min: -90,  max: 90  }),
    body('coordinates.longitude').optional().isFloat({ min: -180, max: 180 }),
    body('coverImage').optional().isURL().withMessage('Cover image must be a valid URL'),
  ],
  validate,
  createCity
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid city ID'),
    body('name').optional().trim().isLength({ max: 100 }),
    body('country').optional().trim(),
    body('state').optional().trim(),
    body('coordinates.latitude').optional().isFloat({ min: -90,  max: 90  }),
    body('coordinates.longitude').optional().isFloat({ min: -180, max: 180 }),
    body('coverImage').optional().isURL(),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  updateCity
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isMongoId().withMessage('Invalid city ID')],
  validate,
  deleteCity
);

export default router;
