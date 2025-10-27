const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Contact = sequelize.define('Contact', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('emergency', 'family', 'medical', 'administrative', 'vendor'),
    allowNull: false,
    defaultValue: 'family'
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
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
  relationship: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_primary'
  },
  isEmergency: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_emergency'
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
  tableName: 'contacts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
const Facility = require('./Facility');
Contact.belongsTo(Facility, { foreignKey: 'facilityId', as: 'facility' });
Facility.hasMany(Contact, { foreignKey: 'facilityId', as: 'contacts' });

module.exports = Contact;
