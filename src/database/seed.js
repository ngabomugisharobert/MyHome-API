const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const config = require('../config/config');

const seedDatabase = async () => {
  try {
    console.log('Seeding database...');

    // Check if admin user already exists
    const existingAdmin = await query('SELECT id FROM users WHERE email = $1', ['admin@myhome.com']);
    
    if (existingAdmin.rows.length > 0) {
      console.log('Admin user already exists, skipping seed...');
      return;
    }

    // Create sample facility
    const facilityResult = await query(`
      INSERT INTO facilities (name, address, phone, email, license_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      'Greenville Healthcare Center',
      '123 Healthcare Drive, Greenville, SC 29601',
      '+1-864-555-0100',
      'info@greenvillehealthcare.com',
      'SC-LIC-2024-001'
    ]);

    const facilityId = facilityResult.rows[0].id;

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    const adminResult = await query(`
      INSERT INTO users (email, password_hash, name, role, facility_id, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      'admin@myhome.com',
      adminPassword,
      'System Administrator',
      config.roles.ADMIN,
      facilityId,
      true,
      true
    ]);

    const adminId = adminResult.rows[0].id;

    // Create test users
    const testUsers = [
      {
        email: 'caregiver1@myhome.com',
        password: 'Caregiver123!',
        name: 'Sarah Johnson',
        role: config.roles.CAREGIVER
      },
      {
        email: 'caregiver2@myhome.com',
        password: 'Caregiver123!',
        name: 'Michael Brown',
        role: config.roles.CAREGIVER
      },
      {
        email: 'doctor@myhome.com',
        password: 'Doctor123!',
        name: 'Dr. Emily Davis',
        role: config.roles.DOCTOR
      },
      {
        email: 'supervisor@myhome.com',
        password: 'Supervisor123!',
        name: 'Robert Wilson',
        role: config.roles.SUPERVISOR
      }
    ];

    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      const userResult = await query(`
        INSERT INTO users (email, password_hash, name, role, facility_id, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        user.email,
        hashedPassword,
        user.name,
        user.role,
        facilityId,
        true,
        true
      ]);

      const userId = userResult.rows[0].id;

      // Create user profile with healthcare-specific fields
      await query(`
        INSERT INTO user_profiles (user_id, phone, city, country, bio, license_number, specialization)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        '+1-864-555-0100',
        'Greenville',
        'USA',
        `Healthcare professional: ${user.name}`,
        user.role === 'doctor' ? 'MD-SC-2024-001' : null,
        user.role === 'doctor' ? 'Internal Medicine' : null
      ]);
    }

    // Create admin profile
    await query(`
      INSERT INTO user_profiles (user_id, phone, city, country, bio)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      adminId,
      '+1-864-555-0100',
      'Greenville',
      'USA',
      'System Administrator'
    ]);

    console.log('Database seeded successfully!');
    console.log('Healthcare facility and test accounts created:');
    console.log('Facility: Greenville Healthcare Center');
    console.log('Admin: admin@myhome.com / Admin123!');
    console.log('Caregiver 1: caregiver1@myhome.com / Caregiver123!');
    console.log('Caregiver 2: caregiver2@myhome.com / Caregiver123!');
    console.log('Doctor: doctor@myhome.com / Doctor123!');
    console.log('Supervisor: supervisor@myhome.com / Supervisor123!');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

const clearDatabase = async () => {
  try {
    console.log('Clearing database...');
    
    await query('DELETE FROM user_profiles');
    await query('DELETE FROM refresh_tokens');
    await query('DELETE FROM users');
    
    console.log('Database cleared successfully!');
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
};

// Run seed based on command line argument
const main = async () => {
  const command = process.argv[2];
  
  try {
    if (command === 'seed') {
      await seedDatabase();
    } else if (command === 'clear') {
      await clearDatabase();
    } else {
      console.log('Usage: node seed.js [seed|clear]');
      process.exit(1);
    }
  } catch (error) {
    console.error('Seed operation failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  seedDatabase,
  clearDatabase
};
