const { Op } = require('sequelize');
const CarePlan = require('../models/CarePlan');
const CarePlanGoal = require('../models/CarePlanGoal');
const Resident = require('../models/Resident');
const User = require('../models/User');

// Get all care plans
const getAllCarePlans = async (req, res) => {
  try {
    const { page = 1, limit = 10, residentId, status, category, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (req.facilityFilter) {
      // Filter by facility through resident
      whereClause['$resident.facilityId$'] = req.facilityFilter.facilityId;
    }

    if (residentId) {
      whereClause.residentId = residentId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { diagnosis: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: carePlans } = await CarePlan.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'name', 'room'],
          include: [{
            model: require('../models/Facility'),
            as: 'facility',
            attributes: ['id', 'name']
          }]
        },
        {
          model: User,
          as: 'creator',
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
        carePlans,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get care plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get care plans'
    });
  }
};

// Get care plan by ID with goals
const getCarePlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const carePlan = await CarePlan.findByPk(id, {
      include: [
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'name', 'room'],
          include: [{
            model: require('../models/Facility'),
            as: 'facility',
            attributes: ['id', 'name']
          }]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: CarePlanGoal,
          as: 'goals',
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!carePlan) {
      return res.status(404).json({
        success: false,
        message: 'Care plan not found'
      });
    }

    res.json({
      success: true,
      data: { carePlan }
    });
  } catch (error) {
    console.error('Get care plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get care plan'
    });
  }
};

// Create care plan
const createCarePlan = async (req, res) => {
  try {
    const {
      residentId,
      title,
      description,
      diagnosis,
      startDate,
      endDate,
      reviewDate,
      priority,
      category,
      goals
    } = req.body;

    const carePlan = await CarePlan.create({
      residentId,
      createdBy: req.user.id,
      title,
      description,
      diagnosis,
      startDate,
      endDate,
      reviewDate,
      priority: priority || 'medium',
      category: category || 'medical',
      status: 'active'
    });

    // Create goals if provided
    if (goals && Array.isArray(goals)) {
      await Promise.all(goals.map(goal => 
        CarePlanGoal.create({
          carePlanId: carePlan.id,
          title: goal.title,
          description: goal.description,
          targetDate: goal.targetDate,
          measurement: goal.measurement,
          interventions: goal.interventions,
          status: 'not_started',
          progress: 0
        })
      ));
    }

    const carePlanWithDetails = await CarePlan.findByPk(carePlan.id, {
      include: [
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'name', 'room']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: CarePlanGoal,
          as: 'goals'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Care plan created successfully',
      data: { carePlan: carePlanWithDetails }
    });
  } catch (error) {
    console.error('Create care plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create care plan'
    });
  }
};

// Update care plan
const updateCarePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const carePlan = await CarePlan.findByPk(id);

    if (!carePlan) {
      return res.status(404).json({
        success: false,
        message: 'Care plan not found'
      });
    }

    await carePlan.update(updateData);

    res.json({
      success: true,
      message: 'Care plan updated successfully',
      data: { carePlan }
    });
  } catch (error) {
    console.error('Update care plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update care plan'
    });
  }
};

// Delete care plan
const deleteCarePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const carePlan = await CarePlan.findByPk(id);

    if (!carePlan) {
      return res.status(404).json({
        success: false,
        message: 'Care plan not found'
      });
    }

    // Delete associated goals first
    await CarePlanGoal.destroy({ where: { carePlanId: id } });

    await carePlan.destroy();

    res.json({
      success: true,
      message: 'Care plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete care plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete care plan'
    });
  }
};

// Goal management functions
const createCarePlanGoal = async (req, res) => {
  try {
    const { carePlanId } = req.params;
    const {
      title,
      description,
      targetDate,
      measurement,
      interventions,
      notes
    } = req.body;

    const goal = await CarePlanGoal.create({
      carePlanId,
      title,
      description,
      targetDate,
      measurement,
      interventions,
      notes,
      status: 'not_started',
      progress: 0
    });

    res.status(201).json({
      success: true,
      message: 'Care plan goal created successfully',
      data: { goal }
    });
  } catch (error) {
    console.error('Create care plan goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create care plan goal'
    });
  }
};

const updateCarePlanGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const goal = await CarePlanGoal.findByPk(id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Care plan goal not found'
      });
    }

    await goal.update(updateData);

    res.json({
      success: true,
      message: 'Care plan goal updated successfully',
      data: { goal }
    });
  } catch (error) {
    console.error('Update care plan goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update care plan goal'
    });
  }
};

const deleteCarePlanGoal = async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await CarePlanGoal.findByPk(id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Care plan goal not found'
      });
    }

    await goal.destroy();

    res.json({
      success: true,
      message: 'Care plan goal deleted successfully'
    });
  } catch (error) {
    console.error('Delete care plan goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete care plan goal'
    });
  }
};

module.exports = {
  getAllCarePlans,
  getCarePlanById,
  createCarePlan,
  updateCarePlan,
  deleteCarePlan,
  createCarePlanGoal,
  updateCarePlanGoal,
  deleteCarePlanGoal
};



