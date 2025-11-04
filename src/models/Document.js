const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.ENUM('license', 'insurance', 'compliance', 'medical', 'administrative', 'legal', 'financial'),
    allowNull: false,
    defaultValue: 'administrative'
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_path'
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_name'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size'
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'mime_type'
  },
  fileHash: {
    type: DataTypes.STRING(128),
    allowNull: true,
    field: 'file_hash'
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
  residentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'resident_id',
    references: {
      model: 'residents',
      key: 'id'
    }
  },
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'uploaded_by',
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
  isConfidential: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_confidential'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  version: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '1.0'
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
  tableName: 'documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
const Facility = require('./Facility');
const User = require('./User');
const Resident = require('./Resident');
Document.belongsTo(Facility, { foreignKey: 'facilityId', as: 'facility' });
Document.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });
Document.belongsTo(Resident, { foreignKey: 'residentId', as: 'resident' });
Facility.hasMany(Document, { foreignKey: 'facilityId', as: 'documents' });
User.hasMany(Document, { foreignKey: 'uploadedBy', as: 'uploadedDocuments' });
Resident.hasMany(Document, { foreignKey: 'residentId', as: 'documents' });

module.exports = Document;
