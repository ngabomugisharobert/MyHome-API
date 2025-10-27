const { Op } = require('sequelize');
const Task = require('../models/Task');
const Facility = require('../models/Facility');
const Resident = require('../models/Resident');
const User = require('../models/User');

// Get all tasks for a facility
const getAllTasks = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, category, assignedTo } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    // Apply filters
    if (status) {
      whereClause.status = status;
    }
    if (priority) {
      whereClause.priority = priority;
    }
    if (category) {
      whereClause.category = category;
    }
    if (assignedTo) {
      whereClause.assignedTo = assignedTo;
    }

    const { count, rows: tasks } = await Task.findAndCountAll({
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
          as: 'assignee',
          attributes: ['id', 'name', 'email', 'role']
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
        tasks,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tasks'
    });
  }
};

// Get task by ID
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id, {
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
          as: 'assignee',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && task.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view tasks from your facility'
      });
    }

    res.json({
      success: true,
      data: { task }
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get task'
    });
  }
};

// Create new task
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      facilityId,
      assignedTo,
      priority,
      category,
      dueDate,
      estimatedDuration,
      residentId,
      notes,
      isRecurring,
      recurrencePattern
    } = req.body;

    // Use facilityId from request or user's facility
    const taskFacilityId = facilityId || req.facilityFilter?.facilityId;

    if (!taskFacilityId) {
      return res.status(400).json({
        success: false,
        message: 'Facility ID is required'
      });
    }

    const task = await Task.create({
      title,
      description,
      facilityId: taskFacilityId,
      assignedTo,
      createdBy: req.user.id,
      priority: priority || 'medium',
      category: category || 'administrative',
      dueDate,
      estimatedDuration,
      residentId,
      notes,
      isRecurring: isRecurring || false,
      recurrencePattern,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task }
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task'
    });
  }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && task.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update tasks from your facility'
      });
    }

    // If task is being completed, set completed date
    if (updateData.status === 'completed' && task.status !== 'completed') {
      updateData.completedDate = new Date();
    }

    await task.update(updateData);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task }
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task'
    });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && task.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete tasks from your facility'
      });
    }

    await task.destroy();

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task'
    });
  }
};

// Get user's assigned tasks
const getUserTasks = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const whereClause = { assignedTo: req.user.id };
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    if (status) {
      whereClause.status = status;
    }
    if (priority) {
      whereClause.priority = priority;
    }

    const tasks = await Task.findAll({
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
      order: [['dueDate', 'ASC'], ['priority', 'DESC']]
    });

    res.json({
      success: true,
      data: { tasks }
    });
  } catch (error) {
    console.error('Get user tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user tasks'
    });
  }
};

// Get overdue tasks
const getOverdueTasks = async (req, res) => {
  try {
    const whereClause = {
      status: { [Op.in]: ['pending', 'in_progress'] },
      dueDate: { [Op.lt]: new Date() }
    };
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    res.json({
      success: true,
      data: { tasks }
    });
  } catch (error) {
    console.error('Get overdue tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get overdue tasks'
    });
  }
};

// Get task statistics
const getTaskStats = async (req, res) => {
  try {
    const whereClause = {};
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    const totalTasks = await Task.count({ where: whereClause });
    const pendingTasks = await Task.count({ 
      where: { ...whereClause, status: 'pending' } 
    });
    const inProgressTasks = await Task.count({ 
      where: { ...whereClause, status: 'in_progress' } 
    });
    const completedTasks = await Task.count({ 
      where: { ...whereClause, status: 'completed' } 
    });
    const overdueTasks = await Task.count({
      where: {
        ...whereClause,
        status: { [Op.in]: ['pending', 'in_progress'] },
        dueDate: { [Op.lt]: new Date() }
      }
    });

    res.json({
      success: true,
      data: {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks
      }
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get task statistics'
    });
  }
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getUserTasks,
  getOverdueTasks,
  getTaskStats
};
