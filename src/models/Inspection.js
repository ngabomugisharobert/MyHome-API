const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Inspection = sequelize.define('Inspection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  facilityId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'facility_id',
    references: {
      model: 'facilities',
      key: 'id'
    }
  },
  inspectionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'inspection_date'
  },
  inspector: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  inspectorTitle: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'inspector_title'
  },
  type: {
    type: DataTypes.ENUM('routine', 'compliance', 'safety', 'medical', 'fire', 'sanitation', 'emergency'),
    allowNull: false,
    defaultValue: 'routine'
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'scheduled'
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  maxScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 100,
    field: 'max_score'
  },
  findings: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  violations: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  recommendations: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  correctiveActions: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'corrective_actions'
  },
  followUpDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'follow_up_date'
  },
  reportPath: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'report_path'
  },
  photos: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  isCompliant: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    field: 'is_compliant'
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: true,
  },
  nextInspectionDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'next_inspection_date'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'updated_at'
  },
}, {
  tableName: 'inspections',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
const Facility = require('./Facility');
const User = require('./User');
Inspection.belongsTo(Facility, { foreignKey: 'facilityId', as: 'facility' });
Inspection.belongsTo(User, { foreignKey: 'conductedBy', as: 'inspectorUser' });
Facility.hasMany(Inspection, { foreignKey: 'facilityId', as: 'inspections' });
User.hasMany(Inspection, { foreignKey: 'conductedBy', as: 'conductedInspections' });

module.exports = Inspection;
