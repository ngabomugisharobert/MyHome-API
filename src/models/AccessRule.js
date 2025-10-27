const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Facility = require('./Facility');
const Resident = require('./Resident');

const AccessRule = sequelize.define('AccessRule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  facilityId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'facilities',
      key: 'id',
    },
  },
  residentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'residents',
      key: 'id',
    },
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'access_rules',
  timestamps: true,
});

module.exports = AccessRule;
