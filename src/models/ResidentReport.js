const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ResidentReport = sequelize.define('ResidentReport', {
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
  reportType: {
    type: DataTypes.ENUM('monthly', 'quarterly', 'annual', 'incident', 'medication', 'care_plan_review', 'discharge', 'custom', 'other'),
    allowNull: false,
    field: 'report_type'
  },
  reportDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'report_date'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  content: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  status: {
    type: DataTypes.ENUM('draft', 'completed', 'reviewed', 'approved', 'archived'),
    allowNull: false,
    defaultValue: 'draft'
  },
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reviewed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reviewedDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reviewed_date'
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
  tableName: 'resident_reports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
const Resident = require('./Resident');
const User = require('./User');

ResidentReport.belongsTo(Resident, { foreignKey: 'residentId', as: 'resident' });
Resident.hasMany(ResidentReport, { foreignKey: 'residentId', as: 'reports' });

ResidentReport.belongsTo(User, { foreignKey: 'createdBy', as: 'author' });
User.hasMany(ResidentReport, { foreignKey: 'createdBy', as: 'reports' });

ResidentReport.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });

module.exports = ResidentReport;


