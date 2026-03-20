import { Router } from 'express';
import {
  getProductCategories,
  getProductCategoryById,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
} from '../controllers/product_category.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { ErrorMiddleware } from '../middleware/error.middleware';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  ErrorMiddleware.asyncHandler(getProductCategories)
);

router.get(
  '/:id',
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(getProductCategoryById)
);

// ── Owner / Admin ─────────────────────────────────────────────────────────────
router.post(
  '/',
  AuthMiddleware.extractUser,
  AuthMiddleware.requireOwnerOrAdmin,
  ValidationMiddleware.createProductCategoryValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(createProductCategory)
);

router.put(
  '/:id',
  AuthMiddleware.extractUser,
  AuthMiddleware.requireOwnerOrAdmin,
  ValidationMiddleware.updateProductCategoryValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(updateProductCategory)
);

router.delete(
  '/:id',
  AuthMiddleware.extractUser,
  AuthMiddleware.requireOwnerOrAdmin,
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(deleteProductCategory)
);

export default router;
