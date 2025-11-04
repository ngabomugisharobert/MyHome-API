const { Op } = require('sequelize');
const Medication = require('../models/Medication');
const MedicationSchedule = require('../models/MedicationSchedule');
const MedicationAdministration = require('../models/MedicationAdministration');
const Resident = require('../models/Resident');
const Facility = require('../models/Facility');
const User = require('../models/User');

const VALID_FORMS = ['tablet', 'capsule', 'liquid', 'injection', 'topical', 'inhaler', 'other'];
const VALID_ROUTES = ['oral', 'intramuscular', 'intravenous', 'subcutaneous', 'topical', 'inhalation', 'other'];
const VALID_MEDICATION_STATUSES = ['active', 'inactive', 'discontinued'];
const VALID_FREQUENCIES = ['once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'as_needed', 'custom'];
const VALID_SCHEDULE_STATUSES = ['active', 'completed', 'discontinued', 'on_hold'];
const VALID_ADMIN_STATUSES = ['scheduled', 'administered', 'missed', 'refused', 'held'];

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = (value) => typeof value === 'string' && uuidRegex.test(value.trim());

const ensureFacilityAccess = (req, res, facilityId, entityLabel) => {
  if (req.facilityFilter && req.facilityFilter.facilityId && facilityId !== req.facilityFilter.facilityId) {
    res.status(403).json({
      success: false,
      message: `Access denied: You can only access ${entityLabel} for your facility`
    });
    return false;
  }
  return true;
};

const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const resolveFacilityId = async (req, res, providedFacilityId, contextLabel) => {
  let facilityId = sanitizeString(providedFacilityId);
  if (!facilityId) {
    facilityId = req.facilityFilter?.facilityId || req.user?.facilityId || null;
  }

  if (!facilityId) {
    res.status(400).json({
      success: false,
      message: 'Facility ID is required. Please select a facility or ensure you are assigned to one.'
    });
    return null;
  }

  if (!isValidUUID(facilityId)) {
    res.status(400).json({
      success: false,
      message: 'Facility ID must be a valid UUID'
    });
    return null;
  }

  if (!ensureFacilityAccess(req, res, facilityId, contextLabel)) {
    return null;
  }

  const facility = await Facility.findByPk(facilityId, { attributes: ['id', 'name'] });
  if (!facility) {
    res.status(404).json({
      success: false,
      message: 'Facility not found. Please select a valid facility.'
    });
    return null;
  }

  return facility.id;
};

const fetchResidentWithAccess = async (req, res, residentId) => {
  if (!isValidUUID(residentId)) {
    res.status(400).json({
      success: false,
      message: 'Resident ID must be a valid UUID'
    });
    return null;
  }

  const resident = await Resident.findByPk(residentId, {
    attributes: ['id', 'facilityId', 'firstName', 'lastName', 'roomNumber']
  });

  if (!resident) {
    res.status(404).json({
      success: false,
      message: 'Resident not found'
    });
    return null;
  }

  if (!ensureFacilityAccess(req, res, resident.facilityId, 'residents')) {
    return null;
  }

  return resident;
};

const fetchMedicationWithAccess = async (req, res, medicationId) => {
  if (!isValidUUID(medicationId)) {
    res.status(400).json({
      success: false,
      message: 'Medication ID must be a valid UUID'
    });
    return null;
  }

  const medication = await Medication.findByPk(medicationId);
  if (!medication) {
    res.status(404).json({
      success: false,
      message: 'Medication not found'
    });
    return null;
  }

  if (!ensureFacilityAccess(req, res, medication.facilityId, 'medications')) {
    return null;
  }

  return medication;
};

const sanitizeMedicationPayload = (payload) => ({
  name: sanitizeString(payload.name),
  genericName: sanitizeString(payload.genericName),
  dosage: sanitizeString(payload.dosage),
  form: payload.form,
  route: payload.route,
  strength: sanitizeString(payload.strength),
  manufacturer: sanitizeString(payload.manufacturer),
  ndcNumber: sanitizeString(payload.ndcNumber),
  status: payload.status
});

// Get all medications
const getAllMedications = async (req, res) => {
  try {
    const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitNum = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const offset = (pageNum - 1) * limitNum;

    const whereClause = {};

    if (req.facilityFilter?.facilityId) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    const { status, search } = req.query;

    if (status) {
      if (!VALID_MEDICATION_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_MEDICATION_STATUSES.join(', ')}`
        });
      }
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
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        }
      ],
      limit: limitNum,
      offset,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        medications,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(count / limitNum)
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
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    if (!ensureFacilityAccess(req, res, medication.facilityId, 'medications')) {
      return;
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
    const payload = sanitizeMedicationPayload(req.body);

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: 'Medication name is required'
      });
    }

    if (!payload.dosage) {
      return res.status(400).json({
        success: false,
        message: 'Dosage is required'
      });
    }

    const form = payload.form || 'tablet';
    if (!VALID_FORMS.includes(form)) {
      return res.status(400).json({
        success: false,
        message: `Form must be one of: ${VALID_FORMS.join(', ')}`
      });
    }

    const route = payload.route || 'oral';
    if (!VALID_ROUTES.includes(route)) {
      return res.status(400).json({
        success: false,
        message: `Route must be one of: ${VALID_ROUTES.join(', ')}`
      });
    }

    const facilityId = await resolveFacilityId(req, res, req.body.facilityId, 'medications');
    if (!facilityId) {
      return;
    }

    const medication = await Medication.create({
      name: payload.name,
      genericName: payload.genericName,
      dosage: payload.dosage,
      form,
      route,
      strength: payload.strength,
      manufacturer: payload.manufacturer,
      ndcNumber: payload.ndcNumber,
      facilityId,
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
    const medication = await Medication.findByPk(id);

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    if (!ensureFacilityAccess(req, res, medication.facilityId, 'medications')) {
      return;
    }

    const updates = sanitizeMedicationPayload(req.body);

    if (updates.name !== undefined && !updates.name) {
      return res.status(400).json({
        success: false,
        message: 'Medication name cannot be empty'
      });
    }

    if (updates.dosage !== undefined && !updates.dosage) {
      return res.status(400).json({
        success: false,
        message: 'Dosage cannot be empty'
      });
    }

    if (updates.form && !VALID_FORMS.includes(updates.form)) {
      return res.status(400).json({
        success: false,
        message: `Form must be one of: ${VALID_FORMS.join(', ')}`
      });
    }

    if (updates.route && !VALID_ROUTES.includes(updates.route)) {
      return res.status(400).json({
        success: false,
        message: `Route must be one of: ${VALID_ROUTES.join(', ')}`
      });
    }

    if (updates.status && !VALID_MEDICATION_STATUSES.includes(updates.status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_MEDICATION_STATUSES.join(', ')}`
      });
    }

    if (req.body.facilityId !== undefined) {
      const newFacilityId = await resolveFacilityId(req, res, req.body.facilityId, 'medications');
      if (!newFacilityId) {
        return;
      }
      updates.facilityId = newFacilityId;
    }

    await medication.update(updates);

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

    if (!ensureFacilityAccess(req, res, medication.facilityId, 'medications')) {
      return;
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
    const resident = await fetchResidentWithAccess(req, res, residentId);
    if (!resident) {
      return;
    }

    const { status } = req.query;
    if (status && !VALID_SCHEDULE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_SCHEDULE_STATUSES.join(', ')}`
      });
    }

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
          attributes: ['id', 'name', 'dosage', 'form', 'route', 'facilityId'],
          where: { facilityId: resident.facilityId },
          required: true
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

    if (!residentId || !medicationId) {
      return res.status(400).json({
        success: false,
        message: 'Resident ID and medication ID are required'
      });
    }

    const resident = await fetchResidentWithAccess(req, res, residentId);
    if (!resident) {
      return;
    }

    const medication = await fetchMedicationWithAccess(req, res, medicationId);
    if (!medication) {
      return;
    }

    if (medication.facilityId !== resident.facilityId) {
      return res.status(400).json({
        success: false,
        message: 'Medication and resident must belong to the same facility'
      });
    }

    if (!dosage || !dosage.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Dosage is required'
      });
    }

    if (!frequency || !VALID_FREQUENCIES.includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: `Frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`
      });
    }

    if (!startDate || Number.isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be a valid date'
      });
    }

    const parsedStart = new Date(startDate);
    let parsedEnd = null;
    if (endDate) {
      parsedEnd = new Date(endDate);
      if (Number.isNaN(parsedEnd.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'End date must be a valid date'
        });
      }
      if (parsedEnd < parsedStart) {
        return res.status(400).json({
          success: false,
          message: 'End date cannot be before start date'
        });
      }
    }

    let schedulePayload = null;
    if (frequency === 'custom') {
      if (!customSchedule || typeof customSchedule !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Custom schedule must be provided when frequency is custom'
        });
      }
      schedulePayload = customSchedule;
    }

    let prescriberId = req.user.id;
    if (prescribedBy) {
      if (!isValidUUID(prescribedBy)) {
        return res.status(400).json({
          success: false,
          message: 'Prescribed by must be a valid UUID'
        });
      }
      const prescriber = await User.findByPk(prescribedBy);
      if (!prescriber) {
        return res.status(404).json({
          success: false,
          message: 'Prescriber not found'
        });
      }
      prescriberId = prescribedBy;
    }

    const schedule = await MedicationSchedule.create({
      residentId: resident.id,
      medicationId: medication.id,
      prescribedBy: prescriberId,
      dosage: dosage.trim(),
      frequency,
      customSchedule: schedulePayload,
      startDate: parsedStart,
      endDate: parsedEnd,
      instructions: sanitizeString(instructions),
      reason: sanitizeString(reason),
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
    const schedule = await MedicationSchedule.findByPk(id, {
      include: [
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'facilityId']
        },
        {
          model: Medication,
          as: 'medication',
          attributes: ['id', 'facilityId']
        }
      ]
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Medication schedule not found'
      });
    }

    if (!ensureFacilityAccess(req, res, schedule.resident.facilityId, 'medication schedules')) {
      return;
    }

    const updates = {};
    let targetFacilityId = schedule.resident.facilityId;

    if (req.body.residentId && req.body.residentId !== schedule.residentId) {
      const resident = await fetchResidentWithAccess(req, res, req.body.residentId);
      if (!resident) {
        return;
      }
      targetFacilityId = resident.facilityId;

      if (schedule.medication && schedule.medication.facilityId !== targetFacilityId && !req.body.medicationId) {
        return res.status(400).json({
          success: false,
          message: 'Please select a medication from the resident’s facility'
        });
      }

      updates.residentId = resident.id;
    }

    if (req.body.medicationId && req.body.medicationId !== schedule.medicationId) {
      const medication = await fetchMedicationWithAccess(req, res, req.body.medicationId);
      if (!medication) {
        return;
      }
      if (medication.facilityId !== targetFacilityId) {
        return res.status(400).json({
          success: false,
          message: 'Medication and resident must belong to the same facility'
        });
      }
      updates.medicationId = medication.id;
    } else if (schedule.medication && schedule.medication.facilityId !== targetFacilityId) {
      return res.status(400).json({
        success: false,
        message: 'Medication and resident must belong to the same facility'
      });
    }

    if (req.body.dosage !== undefined) {
      const dosage = sanitizeString(req.body.dosage);
      if (!dosage) {
        return res.status(400).json({
          success: false,
          message: 'Dosage cannot be empty'
        });
      }
      updates.dosage = dosage;
    }

    if (req.body.frequency) {
      if (!VALID_FREQUENCIES.includes(req.body.frequency)) {
        return res.status(400).json({
          success: false,
          message: `Frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`
        });
      }
      updates.frequency = req.body.frequency;
      if (req.body.frequency !== 'custom') {
        updates.customSchedule = null;
      }
    }

    if (req.body.customSchedule !== undefined) {
      if (schedule.frequency !== 'custom' && updates.frequency !== 'custom') {
        return res.status(400).json({
          success: false,
          message: 'Custom schedule can only be set when frequency is custom'
        });
      }
      if (req.body.customSchedule && typeof req.body.customSchedule !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Custom schedule must be an object'
        });
      }
      updates.customSchedule = req.body.customSchedule || null;
    }

    if (req.body.startDate) {
      const parsed = new Date(req.body.startDate);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Start date must be a valid date'
        });
      }
      updates.startDate = parsed;
    }

    if (req.body.endDate !== undefined) {
      if (req.body.endDate === null || req.body.endDate === '') {
        updates.endDate = null;
      } else {
        const parsedEnd = new Date(req.body.endDate);
        if (Number.isNaN(parsedEnd.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'End date must be a valid date'
          });
        }
        const startDate = updates.startDate || schedule.startDate;
        if (parsedEnd < startDate) {
          return res.status(400).json({
            success: false,
            message: 'End date cannot be before start date'
          });
        }
        updates.endDate = parsedEnd;
      }
    }

    if (req.body.instructions !== undefined) {
      updates.instructions = sanitizeString(req.body.instructions);
    }

    if (req.body.reason !== undefined) {
      updates.reason = sanitizeString(req.body.reason);
    }

    if (req.body.status) {
      if (!VALID_SCHEDULE_STATUSES.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_SCHEDULE_STATUSES.join(', ')}`
        });
      }
      updates.status = req.body.status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    await schedule.update(updates);

    const updatedSchedule = await MedicationSchedule.findByPk(schedule.id, {
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

    res.json({
      success: true,
      message: 'Medication schedule updated successfully',
      data: { schedule: updatedSchedule }
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
    if (!isValidUUID(scheduleId)) {
      return res.status(400).json({
        success: false,
        message: 'Schedule ID must be a valid UUID'
      });
    }

    const schedule = await MedicationSchedule.findByPk(scheduleId, {
      include: [
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'facilityId']
        },
        {
          model: Medication,
          as: 'medication',
          attributes: ['id', 'name', 'dosage', 'form']
        }
      ]
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Medication schedule not found'
      });
    }

    if (!ensureFacilityAccess(req, res, schedule.resident.facilityId, 'medication administrations')) {
      return;
    }

    const {
      scheduledTime,
      administeredTime,
      status,
      notes,
      reasonNotGiven,
      doseGiven
    } = req.body;

    if (!scheduledTime || Number.isNaN(new Date(scheduledTime).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time is required and must be a valid date'
      });
    }

    const statusValue = status || 'administered';
    if (!VALID_ADMIN_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_ADMIN_STATUSES.join(', ')}`
      });
    }

    if (['missed', 'refused', 'held'].includes(statusValue) && !reasonNotGiven) {
      return res.status(400).json({
        success: false,
        message: 'Reason must be provided when status is missed, refused, or held'
      });
    }

    const administration = await MedicationAdministration.create({
      scheduleId,
      scheduledTime: new Date(scheduledTime),
      administeredTime: administeredTime ? new Date(administeredTime) : new Date(),
      administeredBy: req.user.id,
      status: statusValue,
      notes: sanitizeString(notes),
      reasonNotGiven: sanitizeString(reasonNotGiven),
      doseGiven: sanitizeString(doseGiven)
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
              attributes: ['id', 'firstName', 'lastName', 'roomNumber']
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
    const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitNum = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = (pageNum - 1) * limitNum;

    const whereClause = {};
    const { scheduleId, residentId, startDate, endDate } = req.query;

    if (scheduleId) {
      if (!isValidUUID(scheduleId)) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID must be a valid UUID'
        });
      }
      whereClause.scheduleId = scheduleId;
    }

    if (startDate || endDate) {
      whereClause.scheduledTime = {};
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (Number.isNaN(parsedStart.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Start date must be a valid date'
          });
        }
        whereClause.scheduledTime[Op.gte] = parsedStart;
      }
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (Number.isNaN(parsedEnd.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'End date must be a valid date'
          });
        }
        whereClause.scheduledTime[Op.lte] = parsedEnd;
      }
    }

    const residentFilter = residentId ? sanitizeString(residentId) : null;
    if (residentFilter && !isValidUUID(residentFilter)) {
      return res.status(400).json({
        success: false,
        message: 'Resident ID must be a valid UUID'
      });
    }

    const residentWhere = {};
    if (residentFilter) {
      residentWhere.id = residentFilter;
    }
    if (req.facilityFilter?.facilityId) {
      residentWhere.facilityId = req.facilityFilter.facilityId;
    }

    const { count, rows: administrations } = await MedicationAdministration.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: MedicationSchedule,
          as: 'schedule',
          required: true,
          include: [
            {
              model: Medication,
              as: 'medication',
              attributes: ['id', 'name', 'dosage', 'form', 'route', 'facilityId']
            },
            {
              model: Resident,
              as: 'resident',
              attributes: ['id', 'firstName', 'lastName', 'roomNumber', 'facilityId'],
              where: Object.keys(residentWhere).length ? residentWhere : undefined,
              required: !!(residentFilter || req.facilityFilter?.facilityId)
            }
          ]
        },
        {
          model: User,
          as: 'administrator',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: limitNum,
      offset,
      order: [['scheduledTime', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        administrations,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(count / limitNum)
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

    const adminWhere = {};
    if (startDate || endDate) {
      adminWhere.scheduledTime = {};
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (Number.isNaN(parsedStart.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Start date must be a valid date'
          });
        }
        adminWhere.scheduledTime[Op.gte] = parsedStart;
      }
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (Number.isNaN(parsedEnd.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'End date must be a valid date'
          });
        }
        adminWhere.scheduledTime[Op.lte] = parsedEnd;
      }
    }

    const residentFilter = residentId ? sanitizeString(residentId) : null;
    if (residentFilter && !isValidUUID(residentFilter)) {
      return res.status(400).json({
        success: false,
        message: 'Resident ID must be a valid UUID'
      });
    }

    const residentWhere = {};
    if (residentFilter) {
      residentWhere.id = residentFilter;
    }
    if (req.facilityFilter?.facilityId) {
      residentWhere.facilityId = req.facilityFilter.facilityId;
    }

    const administrations = await MedicationAdministration.findAll({
      where: adminWhere,
      attributes: ['id', 'status'],
      include: [
        {
          model: MedicationSchedule,
          as: 'schedule',
          attributes: ['id', 'residentId'],
          required: true,
          include: [
            {
              model: Resident,
              as: 'resident',
              attributes: ['id', 'facilityId'],
              where: Object.keys(residentWhere).length ? residentWhere : undefined,
              required: !!(residentFilter || req.facilityFilter?.facilityId)
            }
          ]
        }
      ]
    });

    const totalScheduled = administrations.length;
    const administeredCount = administrations.filter((admin) => admin.status === 'administered').length;
    const missedCount = administrations.filter((admin) => admin.status === 'missed').length;
    const refusedCount = administrations.filter((admin) => admin.status === 'refused').length;

    res.json({
      success: true,
      data: {
        totalScheduled,
        administered: administeredCount,
        missed: missedCount,
        refused: refusedCount,
        complianceRate: totalScheduled > 0 ? Number(((administeredCount / totalScheduled) * 100).toFixed(2)) : 0
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



