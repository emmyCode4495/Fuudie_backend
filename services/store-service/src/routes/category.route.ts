import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getAllCategories,
  getAllCategoriesAdmin,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/',              getAllCategories);
router.get('/slug/:slug',    getCategoryBySlug);
router.get('/:id',           getCategoryById);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/all', authenticate, requireAdmin, getAllCategoriesAdmin);

router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required — helps stores understand the category')
      .isLength({ max: 500 }),
    body('icon').optional().trim(),
    body('displayOrder').optional().isInt({ min: 0 }).withMessage('displayOrder must be a non-negative integer'),
  ],
  validate,
  createCategory
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid category ID'),
    body('name').optional().trim().isLength({ max: 80 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('icon').optional().trim(),
    body('displayOrder').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  updateCategory
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isMongoId().withMessage('Invalid category ID')],
  validate,
  deleteCategory
);

export default router;
