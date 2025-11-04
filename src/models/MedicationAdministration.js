const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MedicationAdministration = sequelize.define('MedicationAdministration', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  scheduleId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'medication_schedules',
      key: 'id'
    }
  },
  scheduledTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  administeredTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  administeredBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'administered', 'missed', 'refused', 'held'),
    allowNull: false,
    defaultValue: 'scheduled',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reasonNotGiven: {
    type: DataTypes.TEXT,
    allowNull: true, // Reason if missed, refused, or held
  },
  doseGiven: {
    type: DataTypes.STRING,
    allowNull: true, // Actual dose given (may differ from prescribed)
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
  tableName: 'medication_administrations',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// Define associations
const MedicationSchedule = require('./MedicationSchedule');
const User = require('./User');

MedicationAdministration.belongsTo(MedicationSchedule, { foreignKey: 'scheduleId', as: 'schedule' });
MedicationSchedule.hasMany(MedicationAdministration, { foreignKey: 'scheduleId', as: 'administrations' });

MedicationAdministration.belongsTo(User, { foreignKey: 'administeredBy', as: 'administrator' });
User.hasMany(MedicationAdministration, { foreignKey: 'administeredBy', as: 'administeredMedications' });

module.exports = MedicationAdministration;




