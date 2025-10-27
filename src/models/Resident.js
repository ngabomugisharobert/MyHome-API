const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Resident = sequelize.define('Resident', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
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
  room: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dateOfBirth: {
    type: DataTypes.DATE,
    allowNull: true
  },
  medicalRecordNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'discharged'),
    allowNull: false,
    defaultValue: 'active'
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
  tableName: 'residents',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// Define associations
const Facility = require('./Facility');
Resident.belongsTo(Facility, { foreignKey: 'facilityId', as: 'facility' });
Facility.hasMany(Resident, { foreignKey: 'facilityId', as: 'residents' });

module.exports = Resident;