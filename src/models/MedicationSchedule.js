const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MedicationSchedule = sequelize.define('MedicationSchedule', {
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
  medicationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'medications',
      key: 'id'
    }
  },
  prescribedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  dosage: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  frequency: {
    type: DataTypes.ENUM('once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'as_needed', 'custom'),
    allowNull: false,
  },
  customSchedule: {
    type: DataTypes.JSONB,
    allowNull: true, // For custom schedules: { times: ['08:00', '14:00', '20:00'], days: [1,2,3,4,5,6,7] }
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true, // Why this medication is prescribed
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'discontinued', 'on_hold'),
    allowNull: false,
    defaultValue: 'active',
    field: 'status'
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
  tableName: 'medication_schedules',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// Define associations
const Resident = require('./Resident');
const Medication = require('./Medication');
const User = require('./User');

MedicationSchedule.belongsTo(Resident, { foreignKey: 'residentId', as: 'resident' });
Resident.hasMany(MedicationSchedule, { foreignKey: 'residentId', as: 'medicationSchedules' });

MedicationSchedule.belongsTo(Medication, { foreignKey: 'medicationId', as: 'medication' });
Medication.hasMany(MedicationSchedule, { foreignKey: 'medicationId', as: 'schedules' });

MedicationSchedule.belongsTo(User, { foreignKey: 'prescribedBy', as: 'prescriber' });
User.hasMany(MedicationSchedule, { foreignKey: 'prescribedBy', as: 'prescribedMedications' });

module.exports = MedicationSchedule;

