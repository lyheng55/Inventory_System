const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message),
        message: error.message
      });
    }
    next();
  };
};

// User validation schemas
const userRegistrationSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long'
    }),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid('admin', 'inventory_manager', 'sales_staff', 'auditor').default('sales_staff')
});

const userLoginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().required()
});

// Product validation schemas
const productSchema = Joi.object({
  sku: Joi.string().min(3).max(50).required(),
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().allow(''),
  categoryId: Joi.number().integer().positive().required(),
  unitPrice: Joi.number().precision(2).min(0).required(),
  costPrice: Joi.number().precision(2).min(0).required(),
  unit: Joi.string().max(20).default('pcs'),
  barcode: Joi.string().allow(''),
  minStockLevel: Joi.number().integer().min(0).default(0),
  maxStockLevel: Joi.number().integer().min(0).default(1000),
  reorderPoint: Joi.number().integer().min(0).default(10),
  expiryDate: Joi.date().allow(null),
  isPerishable: Joi.boolean().default(false)
});

// Category validation schemas
const categorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().allow(''),
  parentId: Joi.number().integer().positive().allow(null)
});

// Supplier validation schemas
const supplierSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  contactPerson: Joi.string().max(100).allow(''),
  email: Joi.string().email().allow(''),
  phone: Joi.string().max(20).allow(''),
  address: Joi.string().allow(''),
  city: Joi.string().max(50).allow(''),
  state: Joi.string().max(50).allow(''),
  zipCode: Joi.string().max(10).allow(''),
  country: Joi.string().max(50).allow(''),
  taxId: Joi.string().max(50).allow(''),
  paymentTerms: Joi.string().max(100).default('Net 30'),
  rating: Joi.number().integer().min(1).max(5).default(5)
});

// Warehouse validation schemas
const warehouseSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  code: Joi.string().min(2).max(20).required(),
  address: Joi.string().allow(''),
  city: Joi.string().max(50).allow(''),
  state: Joi.string().max(50).allow(''),
  zipCode: Joi.string().max(10).allow(''),
  country: Joi.string().max(50).allow(''),
  capacity: Joi.number().integer().min(0).allow(null),
  managerId: Joi.number().integer().positive().allow(null)
});

// Purchase Order validation schemas
const purchaseOrderSchema = Joi.object({
  supplierId: Joi.number().integer().positive().required(),
  warehouseId: Joi.number().integer().positive().required(),
  expectedDeliveryDate: Joi.date().allow(null),
  notes: Joi.string().allow(''),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.number().integer().positive().required(),
      quantity: Joi.number().integer().positive().required(),
      unitPrice: Joi.number().precision(2).min(0).required(),
      expiryDate: Joi.date().allow(null),
      batchNumber: Joi.string().allow('')
    })
  ).min(1).required()
});

// Stock movement validation schemas
const stockMovementSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  warehouseId: Joi.number().integer().positive().required(),
  movementType: Joi.string().valid('in', 'out', 'transfer', 'adjustment', 'return').required(),
  quantity: Joi.number().integer().required(),
  reason: Joi.string().max(255).allow(''),
  notes: Joi.string().allow(''),
  location: Joi.string().max(100).allow(''),
  expiryDate: Joi.date().allow(null),
  batchNumber: Joi.string().allow('')
});

const stockAdjustmentSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  warehouseId: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().required(),
  reason: Joi.string().max(255).allow(''),
  notes: Joi.string().allow(''),
  location: Joi.string().max(100).allow(''),
  expiryDate: Joi.date().allow(null),
  batchNumber: Joi.string().allow('')
});

// Password change validation schemas
const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'string.min': 'New password must be at least 8 characters long'
    }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Confirm password must match new password'
  })
});

const adminPasswordChangeSchema = Joi.object({
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long'
    }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Confirm password must match new password'
  })
});

module.exports = {
  validateRequest,
  userRegistrationSchema,
  userLoginSchema,
  passwordChangeSchema,
  adminPasswordChangeSchema,
  productSchema,
  categorySchema,
  supplierSchema,
  warehouseSchema,
  purchaseOrderSchema,
  stockMovementSchema,
  stockAdjustmentSchema
};
