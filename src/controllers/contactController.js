const { Op } = require('sequelize');
const Contact = require('../models/Contact');
const Facility = require('../models/Facility');
const Resident = require('../models/Resident');

// Get all contacts for a facility
const getAllContacts = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, search } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    // Apply type filter
    if (type) {
      whereClause.type = type;
    }

    // Apply search filter
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: contacts } = await Contact.findAndCountAll({
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
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contacts'
    });
  }
};

// Get contact by ID
const getContactById = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByPk(id, {
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
      ]
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && contact.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view contacts from your facility'
      });
    }

    res.json({
      success: true,
      data: { contact }
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contact'
    });
  }
};

// Create new contact
const createContact = async (req, res) => {
  try {
    const {
      name,
      type,
      phone,
      email,
      address,
      facilityId,
      residentId,
      relationship,
      isPrimary,
      isEmergency,
      notes
    } = req.body;

    // Use facilityId from request or user's facility
    const contactFacilityId = facilityId || req.facilityFilter?.facilityId;

    if (!contactFacilityId) {
      return res.status(400).json({
        success: false,
        message: 'Facility ID is required'
      });
    }

    const contact = await Contact.create({
      name,
      type,
      phone,
      email,
      address,
      facilityId: contactFacilityId,
      residentId,
      relationship,
      isPrimary: isPrimary || false,
      isEmergency: isEmergency || false,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: { contact }
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create contact'
    });
  }
};

// Update contact
const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const contact = await Contact.findByPk(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && contact.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update contacts from your facility'
      });
    }

    await contact.update(updateData);

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: { contact }
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact'
    });
  }
};

// Delete contact
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByPk(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && contact.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete contacts from your facility'
      });
    }

    await contact.destroy();

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact'
    });
  }
};

// Get emergency contacts
const getEmergencyContacts = async (req, res) => {
  try {
    const whereClause = { isEmergency: true };
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    const contacts = await Contact.findAll({
      where: whereClause,
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { contacts }
    });
  } catch (error) {
    console.error('Get emergency contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get emergency contacts'
    });
  }
};

// Get contacts for a specific resident
const getResidentContacts = async (req, res) => {
  try {
    const { residentId } = req.params;
    const { page = 1, limit = 10, type, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = { residentId };
    
    if (type) {
      whereClause.type = type;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: contacts } = await Contact.findAndCountAll({
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
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get resident contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get resident contacts'
    });
  }
};

module.exports = {
  getAllContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  getEmergencyContacts,
  getResidentContacts
};



