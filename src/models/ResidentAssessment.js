const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ResidentAssessment = sequelize.define('ResidentAssessment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  residentId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'resident_id',
    references: {
      model: 'residents',
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assessmentType: {
    type: DataTypes.ENUM('initial', 'quarterly', 'annual', 'change_in_condition', 'discharge', 'fall', 'medication_review', 'nutrition', 'cognitive', 'functional', 'other'),
    allowNull: false,
    field: 'assessment_type'
  },
  assessmentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'assessment_date'
  },
  nextAssessmentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'next_assessment_date'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  findings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  recommendations: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('draft', 'completed', 'reviewed', 'archived'),
    allowNull: false,
    defaultValue: 'draft'
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  maxScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'max_score'
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
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
  tableName: 'resident_assessments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
const Resident = require('./Resident');
const User = require('./User');

ResidentAssessment.belongsTo(Resident, { foreignKey: 'residentId', as: 'resident' });
Resident.hasMany(ResidentAssessment, { foreignKey: 'residentId', as: 'assessments' });

ResidentAssessment.belongsTo(User, { foreignKey: 'createdBy', as: 'assessor' });
User.hasMany(ResidentAssessment, { foreignKey: 'createdBy', as: 'assessments' });

module.exports = ResidentAssessment;


