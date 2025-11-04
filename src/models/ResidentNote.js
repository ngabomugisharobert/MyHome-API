const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ResidentNote = sequelize.define('ResidentNote', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('general', 'medical', 'behavioral', 'social', 'incident', 'medication', 'nutrition', 'activity', 'other'),
    allowNull: false,
    defaultValue: 'general',
  },
  priority: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'medium',
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_private'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
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
  tableName: 'resident_notes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
const Resident = require('./Resident');
const User = require('./User');

ResidentNote.belongsTo(Resident, { foreignKey: 'residentId', as: 'resident' });
Resident.hasMany(ResidentNote, { foreignKey: 'residentId', as: 'notes' });

ResidentNote.belongsTo(User, { foreignKey: 'createdBy', as: 'author' });
User.hasMany(ResidentNote, { foreignKey: 'createdBy', as: 'notes' });

module.exports = ResidentNote;

