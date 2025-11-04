const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Schedule = sequelize.define('Schedule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('shift', 'appointment', 'task', 'meeting', 'training', 'other'),
    allowNull: false,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  facilityId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'facilities',
      key: 'id'
    }
  },
  residentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'residents',
      key: 'id'
    }
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'),
    allowNull: false,
    defaultValue: 'scheduled',
  },
  recurring: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  recurringPattern: {
    type: DataTypes.JSONB,
    allowNull: true, // { frequency: 'daily'|'weekly'|'monthly', interval: 1, daysOfWeek: [1,2,3] }
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
}, {
  tableName: 'schedules',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// Define associations
const Facility = require('./Facility');
const Resident = require('./Resident');
const User = require('./User');

Schedule.belongsTo(Facility, { foreignKey: 'facilityId', as: 'facility' });
Facility.hasMany(Schedule, { foreignKey: 'facilityId', as: 'schedules' });

Schedule.belongsTo(Resident, { foreignKey: 'residentId', as: 'resident' });
Resident.hasMany(Schedule, { foreignKey: 'residentId', as: 'appointments' });

Schedule.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });
User.hasMany(Schedule, { foreignKey: 'assignedTo', as: 'assignedSchedules' });

Schedule.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(Schedule, { foreignKey: 'createdBy', as: 'createdSchedules' });

module.exports = Schedule;




