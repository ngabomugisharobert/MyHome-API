const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CarePlan = sequelize.define('CarePlan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  residentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'residents',
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
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reviewDate: {
    type: DataTypes.DATE,
    allowNull: true, // Next scheduled review date
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'discontinued', 'on_hold'),
    allowNull: false,
    defaultValue: 'active',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium',
  },
  category: {
    type: DataTypes.ENUM('medical', 'nursing', 'therapy', 'nutrition', 'behavioral', 'social', 'other'),
    allowNull: false,
    defaultValue: 'medical',
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
  tableName: 'care_plans',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// Define associations
const Resident = require('./Resident');
const User = require('./User');

CarePlan.belongsTo(Resident, { foreignKey: 'residentId', as: 'resident' });
Resident.hasMany(CarePlan, { foreignKey: 'residentId', as: 'carePlans' });

CarePlan.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(CarePlan, { foreignKey: 'createdBy', as: 'createdCarePlans' });

module.exports = CarePlan;




