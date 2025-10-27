const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'myhome_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.DB_URL && process.env.DB_URL.includes('sslmode=require') 
        ? { rejectUnauthorized: false } 
        : process.env.NODE_ENV === 'production' 
          ? { rejectUnauthorized: false } 
          : false,
    }
  }
);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL database via Sequelize');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    process.exit(-1);
  }
};

// Initialize connection
testConnection();

module.exports = { sequelize };