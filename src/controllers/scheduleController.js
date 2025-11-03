const { Op } = require('sequelize');
const Schedule = require('../models/Schedule');
const Facility = require('../models/Facility');
const Resident = require('../models/Resident');
const User = require('../models/User');

// Get all schedules
const getAllSchedules = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      type, 
      status, 
      facilityId, 
      residentId, 
      assignedTo,
      startDate,
      endDate
    } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    } else if (facilityId) {
      whereClause.facilityId = facilityId;
    }

    if (type) {
      whereClause.type = type;
    }

    if (status) {
      whereClause.status = status;
    }

    if (residentId) {
      whereClause.residentId = residentId;
    }

    if (assignedTo) {
      whereClause.assignedTo = assignedTo;
    }

    if (startDate || endDate) {
      whereClause[Op.or] = [
        {
          startTime: {
            [Op.between]: [
              startDate ? new Date(startDate) : new Date('1970-01-01'),
              endDate ? new Date(endDate) : new Date('2099-12-31')
            ]
          }
        },
        {
          endTime: {
            [Op.between]: [
              startDate ? new Date(startDate) : new Date('1970-01-01'),
              endDate ? new Date(endDate) : new Date('2099-12-31')
            ]
          }
        }
      ];
    }

    const { count, rows: schedules } = await Schedule.findAndCountAll({
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
          attributes: ['id', 'name', 'room'],
          required: false
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['startTime', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        schedules,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get schedules'
    });
  }
};

// Get schedule by ID
const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findByPk(id, {
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        },
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'name', 'room'],
          required: false
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      data: { schedule }
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get schedule'
    });
  }
};

// Create schedule
const createSchedule = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      startTime,
      endTime,
      facilityId,
      residentId,
      assignedTo,
      status,
      recurring,
      recurringPattern,
      location,
      notes
    } = req.body;

    const scheduleFacilityId = facilityId || req.facilityFilter?.facilityId;

    if (!scheduleFacilityId) {
      return res.status(400).json({
        success: false,
        message: 'Facility ID is required'
      });
    }

    const schedule = await Schedule.create({
      title,
      description,
      type,
      startTime,
      endTime,
      facilityId: scheduleFacilityId,
      residentId,
      assignedTo,
      createdBy: req.user.id,
      status: status || 'scheduled',
      recurring: recurring || false,
      recurringPattern,
      location,
      notes
    });

    const scheduleWithDetails = await Schedule.findByPk(schedule.id, {
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        },
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'name', 'room'],
          required: false
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: { schedule: scheduleWithDetails }
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create schedule'
    });
  }
};

// Update schedule
const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const schedule = await Schedule.findByPk(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    await schedule.update(updateData);

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: { schedule }
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule'
    });
  }
};

// Delete schedule
const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findByPk(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    await schedule.destroy();

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete schedule'
    });
  }
};

// Get schedules for a specific date range (calendar view)
const getCalendarSchedules = async (req, res) => {
  try {
    const { startDate, endDate, facilityId, assignedTo, type } = req.query;

    const whereClause = {};

    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    } else if (facilityId) {
      whereClause.facilityId = facilityId;
    }

    if (assignedTo) {
      whereClause.assignedTo = assignedTo;
    }

    if (type) {
      whereClause.type = type;
    }

    if (startDate && endDate) {
      whereClause[Op.or] = [
        {
          startTime: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        },
        {
          endTime: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        },
        {
          [Op.and]: [
            { startTime: { [Op.lte]: new Date(startDate) } },
            { endTime: { [Op.gte]: new Date(endDate) } }
          ]
        }
      ];
    }

    const schedules = await Schedule.findAll({
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
          attributes: ['id', 'name', 'room'],
          required: false
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [['startTime', 'ASC']]
    });

    res.json({
      success: true,
      data: { schedules }
    });
  } catch (error) {
    console.error('Get calendar schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get calendar schedules'
    });
  }
};

module.exports = {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getCalendarSchedules
};



