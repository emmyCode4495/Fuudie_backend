import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';

export class ValidationMiddleware {
  static handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((err) => ({
          field: err.type === 'field' ? err.path : undefined,
          message: err.msg,
        })),
      });
      return;
    }
    next();
  }

  static mongoIdValidation(paramName: string = 'id'): ValidationChain[] {
    return [param(paramName).isMongoId().withMessage('Invalid ID format')];
  }

  static paginationValidation(): ValidationChain[] {
    return [
      query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    ];
  }

  // ── Product category ───────────────────────────────────────────────────────

  static createProductCategoryValidation(): ValidationChain[] {
    return [
      body('name')
        .trim()
        .isLength({ min: 2, max: 80 })
        .withMessage('Name must be between 2 and 80 characters'),
      body('description')
        .optional()
        .trim()
        .isLength({ max: 300 })
        .withMessage('Description must be 300 characters or fewer'),
      body('storeId')
        .isMongoId()
        .withMessage('A valid store ID is required'),
      body('displayOrder')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Display order must be a non-negative integer'),
    ];
  }

  static updateProductCategoryValidation(): ValidationChain[] {
    return [
      param('id').isMongoId().withMessage('Invalid product category ID'),
      body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 80 }),
      body('description').optional().trim().isLength({ max: 300 }),
      body('displayOrder').optional().isInt({ min: 0 }),
      body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    ];
  }

  // ── Product ────────────────────────────────────────────────────────────────

  static createProductValidation(): ValidationChain[] {
    return [
      body('name')
        .trim()
        .isLength({ min: 2, max: 150 })
        .withMessage('Product name must be between 2 and 150 characters'),
      body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description must be 1000 characters or fewer'),
      body('storeId')
        .isMongoId()
        .withMessage('A valid store ID is required'),
      body('categoryId')
        .isMongoId()
        .withMessage('A valid product category ID is required'),
      body('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
      body('compareAtPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Compare-at price must be a positive number'),
      body('unit')
        .optional()
        .trim()
        .isLength({ max: 30 })
        .withMessage('Unit must be 30 characters or fewer (e.g. kg, pack, bottle)'),
      body('quantity')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Quantity label must be 50 characters or fewer (e.g. 500g, 1L)'),
      body('sku').optional().trim(),
      body('barcode').optional().trim(),
      body('images')
        .optional()
        .isArray()
        .withMessage('Images must be an array of URLs'),
      body('images.*')
        .optional()
        .isURL()
        .withMessage('Each image must be a valid URL'),
      body('inStock')
        .optional()
        .isBoolean()
        .withMessage('inStock must be a boolean'),
      body('stockCount')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stock count must be a non-negative integer'),
      body('requiresPrescription')
        .optional()
        .isBoolean()
        .withMessage('requiresPrescription must be a boolean'),
      body('ageRestricted')
        .optional()
        .isBoolean()
        .withMessage('ageRestricted must be a boolean'),
      body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array of strings'),
    ];
  }

  static updateProductValidation(): ValidationChain[] {
    return [
      param('id').isMongoId().withMessage('Invalid product ID'),
      body('name').optional().trim().isLength({ min: 2, max: 150 }),
      body('description').optional().trim().isLength({ max: 1000 }),
      body('categoryId').optional().isMongoId().withMessage('Invalid product category ID'),
      body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
      body('compareAtPrice').optional().isFloat({ min: 0 }),
      body('unit').optional().trim().isLength({ max: 30 }),
      body('quantity').optional().trim().isLength({ max: 50 }),
      body('sku').optional().trim(),
      body('barcode').optional().trim(),
      body('images').optional().isArray(),
      body('images.*').optional().isURL(),
      body('inStock').optional().isBoolean(),
      body('stockCount').optional().isInt({ min: 0 }),
      body('requiresPrescription').optional().isBoolean(),
      body('ageRestricted').optional().isBoolean(),
      body('isFeatured').optional().isBoolean(),
      body('isActive').optional().isBoolean(),
      body('tags').optional().isArray(),
    ];
  }
}
