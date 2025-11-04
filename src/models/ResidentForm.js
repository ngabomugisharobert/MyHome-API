const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ResidentForm = sequelize.define('ResidentForm', {
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
  formType: {
    type: DataTypes.ENUM('admission', 'consent', 'authorization', 'incident', 'medication', 'care_plan', 'discharge', 'custom', 'other'),
    allowNull: false,
    field: 'form_type'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  formData: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
    field: 'form_data'
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending_signature', 'signed', 'expired', 'archived'),
    allowNull: false,
    defaultValue: 'draft'
  },
  signedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'signed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  signedDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'signed_date'
  },
  witnessBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'witness_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expiry_date'
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
  tableName: 'resident_forms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
const Resident = require('./Resident');
const User = require('./User');

ResidentForm.belongsTo(Resident, { foreignKey: 'residentId', as: 'resident' });
Resident.hasMany(ResidentForm, { foreignKey: 'residentId', as: 'forms' });

ResidentForm.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(ResidentForm, { foreignKey: 'createdBy', as: 'forms' });

ResidentForm.belongsTo(User, { foreignKey: 'signedBy', as: 'signer' });
ResidentForm.belongsTo(User, { foreignKey: 'witnessBy', as: 'witness' });

module.exports = ResidentForm;


