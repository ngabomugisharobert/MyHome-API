const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const Facility = require('../models/Facility');
const Resident = require('../models/Resident');
const User = require('../models/User');
const crypto = require('crypto');
const FileType = require('file-type');

// Get all documents for a facility
const getAllDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    // Apply category filter
    if (category) {
      whereClause.category = category;
    }

    // Apply search filter
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { fileName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: documents } = await Document.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        },
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'firstName', 'lastName', 'roomNumber']
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        documents: documents || [],
        pagination: {
          total: count || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil((count || 0) / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get documents'
    });
  }
};

// Get document by ID
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id, {
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        },
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'firstName', 'lastName', 'roomNumber']
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && document.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view documents from your facility'
      });
    }

    res.json({
      success: true,
      data: { document }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document'
    });
  }
};

// Create new document
const createDocument = async (req, res) => {
  try {
    console.log('📤 Document upload request received');
    console.log('📋 Body:', req.body);
    console.log('📁 File:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file');

    // Check if file was uploaded
    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'File is required. Please select a file to upload.'
      });
    }

    const {
      title,
      description,
      category,
      facilityId,
      residentId,
      expiryDate,
      isConfidential,
      tags
    } = req.body;

    const VALID_CATEGORIES = ['license', 'insurance', 'compliance', 'medical', 'administrative', 'legal', 'financial'];

    let documentFacilityId = facilityId;
    if (typeof documentFacilityId === 'string') {
      documentFacilityId = documentFacilityId.trim();
    }
    if (documentFacilityId === '') {
      documentFacilityId = null;
    }

    let residentRecord = null;

    const isValidUuid = (val) => typeof val === 'string' && /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/.test(val);

    if (residentId) {
      if (!isValidUuid(residentId)) {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ success: false, message: 'Invalid resident ID format' });
      }
      residentRecord = await Resident.findByPk(residentId, {
        attributes: ['id', 'facilityId', 'firstName', 'lastName']
      });

      if (!residentRecord) {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({
          success: false,
          message: 'Resident not found. Please refresh and try again.'
        });
      }

      if (documentFacilityId && documentFacilityId !== residentRecord.facilityId) {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Facility mismatch: the selected facility does not match the resident’s facility.'
        });
      }

      documentFacilityId = residentRecord.facilityId;
    }

    if (!documentFacilityId) {
      documentFacilityId = req.facilityFilter?.facilityId || req.user?.facilityId || null;
    }

    if (!documentFacilityId) {
      console.error('❌ No facility ID found');
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Facility ID is required. Please ensure you are assigned to a facility or provide a facility ID.'
      });
    }

    if (req.facilityFilter && req.facilityFilter.facilityId && documentFacilityId !== req.facilityFilter.facilityId) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        message: 'Access denied: you can only upload documents for your assigned facility.'
      });
    }

    const facility = await Facility.findByPk(documentFacilityId, { attributes: ['id', 'name'] });
    if (!facility) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Facility not found. Please select a valid facility.'
      });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: `Invalid category. Allowed categories: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    // Extract file information
    // Store relative path from backend root
    const absolutePath = req.file.path;
    const relativePath = path.relative(path.join(__dirname, '../../'), absolutePath).replace(/\\/g, '/');
    // Sanitize original filename for DB record (stored filename on disk is already sanitized by multer)
    const rawOriginalName = path.basename(req.file.originalname || 'upload');
    const extFromName = path.extname(rawOriginalName);
    const baseFromName = path.basename(rawOriginalName, extFromName);
    const sanitizedBase = baseFromName.replace(/[^a-z0-9_\-\.\s]/gi, '_').trim().slice(0, 180);
    let fileName = `${sanitizedBase || 'document'}${extFromName}`;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    // Server-side content-type sniffing (magic numbers) to enforce real type
    const sniffed = await FileType.fromFile(absolutePath).catch(() => null);
    const sniffedMime = sniffed?.mime || null;
    const sniffedExt = sniffed?.ext ? `.${sniffed.ext.toLowerCase()}` : null;

    const ALLOWED_MIMES = new Set([
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]);
    const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.ppt', '.pptx']);

    // Map of mime -> allowed extensions for stricter validation when sniffed
    const MIME_TO_EXTS = new Map([
      ['image/jpeg', ['.jpg', '.jpeg']],
      ['image/jpg', ['.jpg', '.jpeg']],
      ['image/png', ['.png']],
      ['image/gif', ['.gif']],
      ['image/webp', ['.webp']],
      ['application/pdf', ['.pdf']],
      ['application/msword', ['.doc']],
      ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['.docx']],
      ['application/vnd.ms-excel', ['.xls']],
      ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ['.xlsx']],
      ['text/plain', ['.txt']],
      ['text/csv', ['.csv']],
      ['application/vnd.ms-powerpoint', ['.ppt']],
      ['application/vnd.openxmlformats-officedocument.presentationml.presentation', ['.pptx']]
    ]);

    // If we could sniff, enforce sniffed type and extension allowlist
    if (sniffedMime && !ALLOWED_MIMES.has(sniffedMime)) {
      if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
      return res.status(400).json({ success: false, message: `Invalid file type detected (${sniffedMime}). Allowed: Images, PDF, Word, Excel, PowerPoint, Text, CSV` });
    }

    // Ensure filename extension is in allowed list (based on sniff if available, otherwise original)
    const extToCheck = sniffedExt || extFromName.toLowerCase();
    if (extToCheck && !ALLOWED_EXTS.has(extToCheck)) {
      if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
      return res.status(400).json({ success: false, message: `Invalid file extension (${extToCheck}). Allowed: ${Array.from(ALLOWED_EXTS).join(', ')}` });
    }

    // If we have a sniffed mime, enforce extension matches typical mapping to prevent disguise
    if (sniffedMime) {
      const allowedExtForMime = MIME_TO_EXTS.get(sniffedMime) || [];
      const lowerOrigExt = extFromName.toLowerCase();
      if (allowedExtForMime.length > 0 && !allowedExtForMime.includes(lowerOrigExt)) {
        if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
        return res.status(400).json({ success: false, message: `File type/extension mismatch. Detected ${sniffedMime} but file extension was ${lowerOrigExt}.` });
      }
    }

    // If sniffing failed but extension suggests a binary/structured type, reject to avoid disguised uploads
    const SNIFF_REQUIRED_EXTS = new Set(['.jpg','.jpeg','.png','.gif','.webp','.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx']);
    if (!sniffedMime && SNIFF_REQUIRED_EXTS.has(extFromName.toLowerCase())) {
      if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
      return res.status(400).json({ success: false, message: 'Unable to verify file type. Please upload a valid file.' });
    }

    // Compute SHA-256 hash of file for duplicate detection
    const computeFileHash = (filePath) => new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('error', reject);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });

    const fileHash = await computeFileHash(absolutePath);

    // Duplicate detection: unique per resident (or per facility if resident is null)
    const duplicateWhere = residentRecord && residentRecord.id
      ? { residentId: residentRecord.id, fileHash }
      : { residentId: null, facilityId: documentFacilityId, fileHash };

    const existingDuplicate = await Document.findOne({ where: duplicateWhere });
    if (existingDuplicate) {
      if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
      return res.status(409).json({ success: false, message: 'Duplicate document detected for this resident/facility (same content).', data: { documentId: existingDuplicate.id } });
    }

    // Use title from request or derive from filename
    const documentTitle = (title && title.trim()) || fileName;

    console.log('📝 Creating document with data:', {
      title: documentTitle,
      category: category || 'administrative',
      facilityId: documentFacilityId,
      residentId: residentId || null,
      uploadedBy: req.user.id
    });

    const parsedExpiryDate = expiryDate ? new Date(expiryDate) : null;
    if (parsedExpiryDate && Number.isNaN(parsedExpiryDate.getTime())) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Expiry date is invalid. Please use YYYY-MM-DD format.'
      });
    }

    if (!documentTitle || !documentTitle.trim()) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Document title is required.'
      });
    }

    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (tagError) {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Tags must be a valid JSON array.'
        });
      }

      if (!Array.isArray(parsedTags)) {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Tags must be an array.'
        });
      }
    }

    const document = await Document.create({
      title: documentTitle.trim(),
      description: description || null,
      category: category || 'administrative',
      filePath: relativePath,
      fileName,
      fileSize,
      mimeType: sniffedMime || mimeType,
      fileHash,
      facilityId: documentFacilityId,
      residentId: residentRecord ? residentRecord.id : (residentId || null),
      uploadedBy: req.user.id,
      expiryDate: parsedExpiryDate,
      isConfidential: isConfidential === 'true' || isConfidential === true || false,
      tags: parsedTags
    });

    console.log('✅ Document created successfully:', document.id);

    // Fetch document with associations
    const documentWithAssociations = await Document.findByPk(document.id, {
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        },
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'firstName', 'lastName', 'roomNumber']
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document: documentWithAssociations }
    });
  } catch (error) {
    console.error('❌ Create document error:', error);
    console.error('Error stack:', error.stack);
    
    // Clean up uploaded file if document creation failed
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log('🧹 Cleaned up uploaded file');
        }
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    // Provide more specific error messages
    let errorMessage = 'Failed to create document';
    if (error.name === 'SequelizeValidationError') {
      errorMessage = 'Validation error: ' + error.errors.map(e => e.message).join(', ');
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      errorMessage = 'Invalid facility or resident ID';
    } else {
      errorMessage = error.message || 'Failed to create document';
    }

    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
};

// Update document
const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && document.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update documents from your facility'
      });
    }

    await document.update(updateData);

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: { document }
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document'
    });
  }
};

// Get documents by category
const getDocumentsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const whereClause = { category };
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    const documents = await Document.findAll({
      where: whereClause,
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        },
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'firstName', 'lastName', 'roomNumber']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { documents }
    });
  } catch (error) {
    console.error('Get documents by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get documents by category'
    });
  }
};

// Get expiring documents
const getExpiringDocuments = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));

    const whereClause = {
      expiryDate: {
        [Op.lte]: expiryDate,
        [Op.gte]: new Date()
      }
    };
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    const documents = await Document.findAll({
      where: whereClause,
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        }
      ],
      order: [['expiryDate', 'ASC']]
    });

    res.json({
      success: true,
      data: { documents }
    });
  } catch (error) {
    console.error('Get expiring documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get expiring documents'
    });
  }
};

// Get documents for a specific resident
const getResidentDocuments = async (req, res) => {
  try {
    const { residentId } = req.params;
    const { page = 1, limit = 10, category, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const isValidUuid = (val) => typeof val === 'string' && /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/.test(val);
    if (!isValidUuid(residentId)) {
      return res.status(400).json({ success: false, message: 'Invalid resident ID format' });
    }

    const resident = await Resident.findByPk(residentId, {
      attributes: ['id', 'facilityId', 'firstName', 'lastName']
    });

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'Resident not found'
      });
    }

    if (req.facilityFilter && req.facilityFilter.facilityId && resident.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view documents for residents in your facility'
      });
    }

    const whereClause = {
      residentId,
      facilityId: resident.facilityId
    };
    
    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { fileName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: documents } = await Document.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        },
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'firstName', 'lastName', 'roomNumber']
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        documents: documents || [],
        pagination: {
          total: count || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil((count || 0) / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get resident documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get resident documents: ' + error.message
    });
  }
};

// Download document file
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && document.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only download documents from your facility'
      });
    }

    // Check if file exists
    const filePath = path.join(__dirname, '../../', document.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document'
    });
  }
};

// Delete document file when document is deleted
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && document.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete documents from your facility'
      });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../', document.filePath);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    await document.destroy();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
};

module.exports = {
  getAllDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentsByCategory,
  getExpiringDocuments,
  getResidentDocuments,
  downloadDocument
};



