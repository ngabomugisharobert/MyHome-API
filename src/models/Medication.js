const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Medication = sequelize.define('Medication', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  genericName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dosage: {
    type: DataTypes.STRING,
    allowNull: false, // e.g., "50mg", "1 tablet"
  },
  form: {
    type: DataTypes.ENUM('tablet', 'capsule', 'liquid', 'injection', 'topical', 'inhaler', 'other'),
    allowNull: false,
    defaultValue: 'tablet',
  },
  route: {
    type: DataTypes.ENUM('oral', 'intramuscular', 'intravenous', 'subcutaneous', 'topical', 'inhalation', 'other'),
    allowNull: false,
    defaultValue: 'oral',
  },
  strength: {
    type: DataTypes.STRING,
    allowNull: true, // e.g., "50mg/5ml"
  },
  manufacturer: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ndcNumber: {
    type: DataTypes.STRING,
    allowNull: true, // National Drug Code
  },
  facilityId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'facilities',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'discontinued'),
    allowNull: false,
    defaultValue: 'active',
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
  tableName: 'medications',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// Define associations
const Facility = require('./Facility');
Medication.belongsTo(Facility, { foreignKey: 'facilityId', as: 'facility' });
Facility.hasMany(Medication, { foreignKey: 'facilityId', as: 'medications' });

module.exports = Medication;



