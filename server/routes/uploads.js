const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireStaff } = require('../middleware/auth');
const { Product, PurchaseOrder } = require('../models');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    
    // Create subdirectories based on file type
    let subDir = 'general';
    if (file.fieldname === 'productImage') {
      subDir = 'products';
    } else if (file.fieldname === 'document') {
      subDir = 'documents';
    }
    
    const fullPath = path.join(uploadPath, subDir);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'productImage': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    'document': ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };
  
  const fieldTypes = allowedTypes[file.fieldname] || allowedTypes['document'];
  
  if (fieldTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${fieldTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 5 // Maximum 5 files per request
  }
});

// Upload product image
router.post('/product-image', authenticateToken, requireStaff, upload.single('productImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const productId = req.body.productId;
    
    if (!productId) {
      // Delete the uploaded file if no product ID provided
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      // Delete the uploaded file if product doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete old image if exists
    if (product.image) {
      const oldImagePath = path.join(process.env.UPLOAD_PATH || './uploads', product.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Update product with new image path
    const imagePath = path.relative(process.env.UPLOAD_PATH || './uploads', req.file.path);
    await product.update({ image: imagePath });

    res.json({
      message: 'Product image uploaded successfully',
      imagePath: imagePath,
      imageUrl: `/uploads/${imagePath}`,
      product: {
        id: product.id,
        name: product.name,
        image: imagePath
      }
    });
  } catch (error) {
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Product image upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload multiple product images
router.post('/product-images', authenticateToken, requireStaff, upload.array('productImages', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const productId = req.body.productId;
    
    if (!productId) {
      // Delete all uploaded files if no product ID provided
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      // Delete all uploaded files if product doesn't exist
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(404).json({ error: 'Product not found' });
    }

    const uploadedImages = req.files.map(file => {
      const imagePath = path.relative(process.env.UPLOAD_PATH || './uploads', file.path);
      return {
        filename: file.filename,
        originalName: file.originalname,
        path: imagePath,
        url: `/uploads/${imagePath}`,
        size: file.size,
        mimetype: file.mimetype
      };
    });

    res.json({
      message: 'Product images uploaded successfully',
      images: uploadedImages,
      product: {
        id: product.id,
        name: product.name
      }
    });
  } catch (error) {
    // Delete all uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    console.error('Product images upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload document (for purchase orders, etc.)
router.post('/document', authenticateToken, requireStaff, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { type, referenceId, description } = req.body;
    
    if (!type) {
      // Delete the uploaded file if no type provided
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Document type is required' });
    }

    const documentInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: path.relative(process.env.UPLOAD_PATH || './uploads', req.file.path),
      url: `/uploads/${path.relative(process.env.UPLOAD_PATH || './uploads', req.file.path)}`,
      size: req.file.size,
      mimetype: req.file.mimetype,
      type: type,
      referenceId: referenceId || null,
      description: description || null,
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    };

    res.json({
      message: 'Document uploaded successfully',
      document: documentInfo
    });
  } catch (error) {
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload multiple documents
router.post('/documents', authenticateToken, requireStaff, upload.array('documents', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { type, referenceId, description } = req.body;
    
    if (!type) {
      // Delete all uploaded files if no type provided
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(400).json({ error: 'Document type is required' });
    }

    const uploadedDocuments = req.files.map(file => {
      const documentPath = path.relative(process.env.UPLOAD_PATH || './uploads', file.path);
      return {
        filename: file.filename,
        originalName: file.originalname,
        path: documentPath,
        url: `/uploads/${documentPath}`,
        size: file.size,
        mimetype: file.mimetype,
        type: type,
        referenceId: referenceId || null,
        description: description || null,
        uploadedBy: req.user.id,
        uploadedAt: new Date()
      };
    });

    res.json({
      message: 'Documents uploaded successfully',
      documents: uploadedDocuments
    });
  } catch (error) {
    // Delete all uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    console.error('Documents upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete uploaded file
router.delete('/file', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const fullPath = path.join(process.env.UPLOAD_PATH || './uploads', filePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if file is being used by any product
    const product = await Product.findOne({ where: { image: filePath } });
    if (product) {
      return res.status(400).json({ error: 'Cannot delete file that is currently in use' });
    }

    // Delete the file
    fs.unlinkSync(fullPath);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get file information
router.get('/file-info', authenticateToken, async (req, res) => {
  try {
    const { filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const fullPath = path.join(process.env.UPLOAD_PATH || './uploads', filePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(fullPath);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);

    res.json({
      filename: name,
      extension: ext,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      url: `/uploads/${filePath}`,
      path: filePath
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List uploaded files
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    
    let searchPath = uploadPath;
    if (type) {
      searchPath = path.join(uploadPath, type);
    }

    if (!fs.existsSync(searchPath)) {
      return res.json({ files: [], total: 0 });
    }

    const files = fs.readdirSync(searchPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => {
        const filePath = path.join(searchPath, dirent.name);
        const stats = fs.statSync(filePath);
        const relativePath = path.relative(uploadPath, filePath);
        
        return {
          name: dirent.name,
          path: relativePath,
          url: `/uploads/${relativePath}`,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          extension: path.extname(dirent.name)
        };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified))
      .slice(offset, offset + parseInt(limit));

    res.json({
      files,
      total: files.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
