const { sequelize } = require('../../src/config/database');
const User = require('../../src/models/User');
const Facility = require('../../src/models/Facility');
const Role = require('../../src/models/Role');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../src/config/config');

// Test database setup
const setupTestDB = async () => {
  try {
    // Sync database (force: true will drop and recreate tables)
    await sequelize.sync({ force: true });
    
    // Create test facility
    const testFacility = await Facility.create({
      name: 'Test Healthcare Center',
      address: '123 Test St, Test City, TC 12345',
      phone: '555-0123',
      email: 'test@healthcare.com',
      licenseNumber: 'TEST-LIC-001',
      isActive: true
    });

    // Create test role
    const testRole = await Role.create({
      name: 'Test Role',
      description: 'Test role for testing',
      permissions: ['1', '2', '3'],
      isActive: true
    });

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 12);
    const testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: hashedPassword,
      role: 'admin',
      isActive: true,
      emailVerified: true,
      facilityId: testFacility.id
    });

    // Create additional test users for different roles
    const caregiverPassword = await bcrypt.hash('password123', 12);
    const caregiver = await User.create({
      name: 'Test Caregiver',
      email: 'caregiver@example.com',
      passwordHash: caregiverPassword,
      role: 'caregiver',
      isActive: true,
      emailVerified: true,
      facilityId: testFacility.id
    });

    const doctorPassword = await bcrypt.hash('password123', 12);
    const doctor = await User.create({
      name: 'Test Doctor',
      email: 'doctor@example.com',
      passwordHash: doctorPassword,
      role: 'doctor',
      isActive: true,
      emailVerified: true,
      facilityId: testFacility.id
    });

    const supervisorPassword = await bcrypt.hash('password123', 12);
    const supervisor = await User.create({
      name: 'Test Supervisor',
      email: 'supervisor@example.com',
      passwordHash: supervisorPassword,
      role: 'supervisor',
      isActive: true,
      emailVerified: true,
      facilityId: testFacility.id
    });

    return { 
      testFacility, 
      testRole, 
      testUser, 
      caregiver, 
      doctor, 
      supervisor 
    };
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
};

const cleanupTestDB = async () => {
  try {
    await sequelize.close();
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    throw error;
  }
};

// Helper function to get auth token (without HTTP request)
const getAuthToken = async (app, email = 'test@example.com', password = 'password123') => {
  // For tests, we'll create a token directly instead of making HTTP requests
  const user = await User.findOne({ where: { email } });
  if (user) {
    const token = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    return token;
  }
  throw new Error('User not found');
};

module.exports = { 
  setupTestDB, 
  cleanupTestDB, 
  getAuthToken 
};
