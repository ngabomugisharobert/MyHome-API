// Test setup file
const { sequelize } = require('../src/config/database');

// Increase timeout for database operations
jest.setTimeout(30000);

// Close database connection after all tests
afterAll(async () => {
  await sequelize.close();
});


