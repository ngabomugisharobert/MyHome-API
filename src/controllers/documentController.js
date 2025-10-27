const { Op } = require('sequelize');
const Document = require('../models/Document');
const Facility = require('../models/Facility');
const Resident = require('../models/Resident');
const User = require('../models/User');

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
          attributes: ['id', 'name', 'room']
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
        documents,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
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
          attributes: ['id', 'name', 'room']
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
    const {
      title,
      description,
      category,
      filePath,
      fileName,
      fileSize,
      mimeType,
      facilityId,
      residentId,
      expiryDate,
      isConfidential,
      tags
    } = req.body;

    // Use facilityId from request or user's facility
    const documentFacilityId = facilityId || req.facilityFilter?.facilityId;

    if (!documentFacilityId) {
      return res.status(400).json({
        success: false,
        message: 'Facility ID is required'
      });
    }

    const document = await Document.create({
      title,
      description,
      category,
      filePath,
      fileName,
      fileSize,
      mimeType,
      facilityId: documentFacilityId,
      residentId,
      uploadedBy: req.user.id,
      expiryDate,
      isConfidential: isConfidential || false,
      tags: tags || []
    });

    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      data: { document }
    });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create document'
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

// Delete document
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
          attributes: ['id', 'name', 'room']
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

module.exports = {
  getAllDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentsByCategory,
  getExpiringDocuments
};
