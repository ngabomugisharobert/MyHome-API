const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CarePlanGoal = sequelize.define('CarePlanGoal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  carePlanId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'care_plans',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  targetDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('not_started', 'in_progress', 'achieved', 'not_achieved', 'cancelled'),
    allowNull: false,
    defaultValue: 'not_started',
  },
  progress: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  measurement: {
    type: DataTypes.TEXT,
    allowNull: true, // How to measure progress (e.g., "Reduce blood pressure to below 140/90")
  },
  interventions: {
    type: DataTypes.JSONB,
    allowNull: true, // Array of intervention actions
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
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
  tableName: 'care_plan_goals',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// Define associations
const CarePlan = require('./CarePlan');

CarePlanGoal.belongsTo(CarePlan, { foreignKey: 'carePlanId', as: 'carePlan' });
CarePlan.hasMany(CarePlanGoal, { foreignKey: 'carePlanId', as: 'goals' });

module.exports = CarePlanGoal;




