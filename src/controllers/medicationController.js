const { Op } = require('sequelize');
const Medication = require('../models/Medication');
const MedicationSchedule = require('../models/MedicationSchedule');
const MedicationAdministration = require('../models/MedicationAdministration');
const Resident = require('../models/Resident');
const Facility = require('../models/Facility');
const User = require('../models/User');

// Get all medications
const getAllMedications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { genericName: { [Op.iLike]: `%${search}%` } },
        { ndcNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: medications } = await Medication.findAndCountAll({
      where: whereClause,
      include: [{
        model: Facility,
        as: 'facility',
        attributes: ['id', 'name']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        medications,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get medications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get medications'
    });
  }
};

// Get medication by ID
const getMedicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const medication = await Medication.findByPk(id, {
      include: [{
        model: Facility,
        as: 'facility',
        attributes: ['id', 'name']
      }]
    });

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    res.json({
      success: true,
      data: { medication }
    });
  } catch (error) {
    console.error('Get medication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get medication'
    });
  }
};

// Create medication
const createMedication = async (req, res) => {
  try {
    const {
      name,
      genericName,
      dosage,
      form,
      route,
      strength,
      manufacturer,
      ndcNumber,
      facilityId
    } = req.body;

    const medicationFacilityId = facilityId || req.facilityFilter?.facilityId;

    if (!medicationFacilityId) {
      return res.status(400).json({
        success: false,
        message: 'Facility ID is required'
      });
    }

    const medication = await Medication.create({
      name,
      genericName,
      dosage,
      form,
      route,
      strength,
      manufacturer,
      ndcNumber,
      facilityId: medicationFacilityId,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Medication created successfully',
      data: { medication }
    });
  } catch (error) {
    console.error('Create medication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create medication'
    });
  }
};

// Update medication
const updateMedication = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const medication = await Medication.findByPk(id);

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    await medication.update(updateData);

    res.json({
      success: true,
      message: 'Medication updated successfully',
      data: { medication }
    });
  } catch (error) {
    console.error('Update medication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medication'
    });
  }
};

// Delete medication
const deleteMedication = async (req, res) => {
  try {
    const { id } = req.params;

    const medication = await Medication.findByPk(id);

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    await medication.destroy();

    res.json({
      success: true,
      message: 'Medication deleted successfully'
    });
  } catch (error) {
    console.error('Delete medication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete medication'
    });
  }
};

// Get medication schedules for a resident
const getResidentMedicationSchedules = async (req, res) => {
  try {
    const { residentId } = req.params;
    const { status } = req.query;

    const whereClause = { residentId };
    
    if (status) {
      whereClause.status = status;
    }

    const schedules = await MedicationSchedule.findAll({
      where: whereClause,
      include: [
        {
          model: Medication,
          as: 'medication',
          attributes: ['id', 'name', 'dosage', 'form', 'route']
        },
        {
          model: User,
          as: 'prescriber',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['startDate', 'DESC']]
    });

    res.json({
      success: true,
      data: { schedules }
    });
  } catch (error) {
    console.error('Get medication schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get medication schedules'
    });
  }
};

// Create medication schedule
const createMedicationSchedule = async (req, res) => {
  try {
    const {
      residentId,
      medicationId,
      prescribedBy,
      dosage,
      frequency,
      customSchedule,
      startDate,
      endDate,
      instructions,
      reason
    } = req.body;

    const schedule = await MedicationSchedule.create({
      residentId,
      medicationId,
      prescribedBy: prescribedBy || req.user.id,
      dosage,
      frequency,
      customSchedule,
      startDate,
      endDate,
      instructions,
      reason,
      status: 'active'
    });

    const scheduleWithDetails = await MedicationSchedule.findByPk(schedule.id, {
      include: [
        {
          model: Medication,
          as: 'medication',
          attributes: ['id', 'name', 'dosage', 'form', 'route']
        },
        {
          model: User,
          as: 'prescriber',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Medication schedule created successfully',
      data: { schedule: scheduleWithDetails }
    });
  } catch (error) {
    console.error('Create medication schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create medication schedule'
    });
  }
};

// Update medication schedule
const updateMedicationSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const schedule = await MedicationSchedule.findByPk(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Medication schedule not found'
      });
    }

    await schedule.update(updateData);

    res.json({
      success: true,
      message: 'Medication schedule updated successfully',
      data: { schedule }
    });
  } catch (error) {
    console.error('Update medication schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medication schedule'
    });
  }
};

// Record medication administration
const recordMedicationAdministration = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const {
      scheduledTime,
      administeredTime,
      status,
      notes,
      reasonNotGiven,
      doseGiven
    } = req.body;

    const administration = await MedicationAdministration.create({
      scheduleId,
      scheduledTime,
      administeredTime: administeredTime || new Date(),
      administeredBy: req.user.id,
      status: status || 'administered',
      notes,
      reasonNotGiven,
      doseGiven
    });

    const administrationWithDetails = await MedicationAdministration.findByPk(administration.id, {
      include: [
        {
          model: MedicationSchedule,
          as: 'schedule',
          include: [
            {
              model: Medication,
              as: 'medication',
              attributes: ['id', 'name', 'dosage', 'form']
            },
            {
              model: Resident,
              as: 'resident',
              attributes: ['id', 'name', 'room']
            }
          ]
        },
        {
          model: User,
          as: 'administrator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Medication administration recorded successfully',
      data: { administration: administrationWithDetails }
    });
  } catch (error) {
    console.error('Record medication administration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record medication administration'
    });
  }
};

// Get medication administration records
const getMedicationAdministrations = async (req, res) => {
  try {
    const { scheduleId, residentId, startDate, endDate } = req.query;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (scheduleId) {
      whereClause.scheduleId = scheduleId;
    }

    if (startDate || endDate) {
      whereClause.scheduledTime = {};
      if (startDate) {
        whereClause.scheduledTime[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.scheduledTime[Op.lte] = new Date(endDate);
      }
    }

    const { count, rows: administrations } = await MedicationAdministration.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: MedicationSchedule,
          as: 'schedule',
          include: [
            {
              model: Medication,
              as: 'medication',
              attributes: ['id', 'name', 'dosage', 'form']
            },
            {
              model: Resident,
              as: 'resident',
              attributes: ['id', 'name', 'room'],
              ...(residentId && { where: { id: residentId } })
            }
          ]
        },
        {
          model: User,
          as: 'administrator',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['scheduledTime', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        administrations,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get medication administrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get medication administrations'
    });
  }
};

// Get medication statistics
const getMedicationStats = async (req, res) => {
  try {
    const { residentId, startDate, endDate } = req.query;

    const whereClause = {};
    if (residentId) {
      whereClause.residentId = residentId;
    }

    const administrationsWhere = {};
    if (startDate || endDate) {
      administrationsWhere.scheduledTime = {};
      if (startDate) {
        administrationsWhere.scheduledTime[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        administrationsWhere.scheduledTime[Op.lte] = new Date(endDate);
      }
    }

    const totalScheduled = await MedicationAdministration.count({
      where: administrationsWhere,
      include: residentId ? [{
        model: MedicationSchedule,
        as: 'schedule',
        where: { residentId }
      }] : []
    });

    const administered = await MedicationAdministration.count({
      where: { ...administrationsWhere, status: 'administered' },
      include: residentId ? [{
        model: MedicationSchedule,
        as: 'schedule',
        where: { residentId }
      }] : []
    });

    const missed = await MedicationAdministration.count({
      where: { ...administrationsWhere, status: 'missed' },
      include: residentId ? [{
        model: MedicationSchedule,
        as: 'schedule',
        where: { residentId }
      }] : []
    });

    const refused = await MedicationAdministration.count({
      where: { ...administrationsWhere, status: 'refused' },
      include: residentId ? [{
        model: MedicationSchedule,
        as: 'schedule',
        where: { residentId }
      }] : []
    });

    res.json({
      success: true,
      data: {
        totalScheduled,
        administered,
        missed,
        refused,
        complianceRate: totalScheduled > 0 ? ((administered / totalScheduled) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get medication stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get medication statistics'
    });
  }
};

module.exports = {
  getAllMedications,
  getMedicationById,
  createMedication,
  updateMedication,
  deleteMedication,
  getResidentMedicationSchedules,
  createMedicationSchedule,
  updateMedicationSchedule,
  recordMedicationAdministration,
  getMedicationAdministrations,
  getMedicationStats
};



