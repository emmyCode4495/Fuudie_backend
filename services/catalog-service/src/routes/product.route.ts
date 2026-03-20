import { Router } from 'express';
import {
  getProducts,
  getProductsAdmin,
  getProductById,
  getProductsByStore,
  getMyProducts,
  createProduct,
  updateProduct,
  updateProductStock,
  recordOrderUpdate,
  deleteProduct,
} from '../controllers/product.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { ErrorMiddleware } from '../middleware/error.middleware';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  ValidationMiddleware.paginationValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(getProducts)
);

router.get(
  '/store/:storeId',
  ValidationMiddleware.mongoIdValidation('storeId'),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(getProductsByStore)
);

router.get(
  '/:id',
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(getProductById)
);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.get(
  '/me/products',
  AuthMiddleware.extractUser,
  AuthMiddleware.requireAuth,
  ValidationMiddleware.paginationValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(getMyProducts)
);

router.post(
  '/',
  AuthMiddleware.extractUser,
  AuthMiddleware.requireOwnerOrAdmin,
  ValidationMiddleware.createProductValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(createProduct)
);

router.put(
  '/:id',
  AuthMiddleware.extractUser,
  AuthMiddleware.requireOwnerOrAdmin,
  ValidationMiddleware.updateProductValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(updateProduct)
);

router.patch(
  '/:id/stock',
  AuthMiddleware.extractUser,
  AuthMiddleware.requireOwnerOrAdmin,
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(updateProductStock)
);

router.delete(
  '/:id',
  AuthMiddleware.extractUser,
  AuthMiddleware.requireOwnerOrAdmin,
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(deleteProduct)
);

// ── Internal (order-service → catalog-service) ────────────────────────────────
// Called by order-service after a successful order to update product stats.
// Secured by the api-gateway internal network — no public exposure.
router.patch(
  '/internal/order-update',
  AuthMiddleware.extractUser,
  AuthMiddleware.requireAuth,
  ErrorMiddleware.asyncHandler(recordOrderUpdate)
);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get(
  '/admin/all',
  AuthMiddleware.extractUser,
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.paginationValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(getProductsAdmin)
);

export default router;
