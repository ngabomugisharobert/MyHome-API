const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Resident = sequelize.define('Resident', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'last_name'
  },
  dob: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'dob'
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true,
    field: 'gender'
  },
  photoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'photo_url'
  },
  admissionDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'admission_date'
  },
  dischargeDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'discharge_date'
  },
  roomNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'room_number'
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
  primaryPhysician: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'primary_physician',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  emergencyContactName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'emergency_contact_name'
  },
  emergencyContactPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'emergency_contact_phone'
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'diagnosis'
  },
  allergies: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'allergies'
  },
  dietaryRestrictions: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'dietary_restrictions'
  },
  mobilityLevel: {
    type: DataTypes.ENUM('independent', 'assisted', 'wheelchair', 'bedridden'),
    allowNull: true,
    field: 'mobility_level'
  },
  careLevel: {
    type: DataTypes.ENUM('independent', 'assisted_living', 'memory_care', 'skilled_nursing', 'hospice'),
    allowNull: true,
    field: 'care_level'
  },
  insuranceProvider: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'insurance_provider'
  },
  policyNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'policy_number'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'discharged'),
    allowNull: false,
    defaultValue: 'active',
    field: 'status'
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
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  },
}, {
  tableName: 'residents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We'll handle soft delete manually
  getterMethods: {
    fullName() {
      return `${this.firstName} ${this.lastName}`;
    }
  },
  defaultScope: {
    where: {
      deletedAt: null
    }
  },
  scopes: {
    withDeleted: {
      where: {}
    },
    onlyDeleted: {
      where: {
        deletedAt: { [require('sequelize').Op.ne]: null }
      }
    }
  }
});

// Add instance method for soft delete
Resident.prototype.softDelete = async function() {
  return await this.update({ deletedAt: new Date() });
};

// Add instance method for restore
Resident.prototype.restore = async function() {
  return await this.update({ deletedAt: null });
};

// Define associations
const Facility = require('./Facility');
Resident.belongsTo(Facility, { foreignKey: 'facilityId', as: 'facility' });
Facility.hasMany(Resident, { foreignKey: 'facilityId', as: 'residents' });

module.exports = Resident;