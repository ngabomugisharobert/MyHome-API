const { sequelize } = require('../config/database');
const User = require('../models/User');
const Facility = require('../models/Facility');
const bcrypt = require('bcryptjs');

const seedTestAccounts = async () => {
  try {
    console.log('🌱 Starting test accounts seeding...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Clear existing users (optional - comment out if you want to keep existing data)
    console.log('🗑️ Clearing existing users...');
    await User.destroy({ where: {} });
    console.log('✅ Existing users cleared');

    // Create a test facility first
    console.log('🏥 Creating test facility...');
    const testFacility = await Facility.create({
      name: 'Greenville Healthcare Center',
      address: '123 Healthcare Drive, Greenville, SC 29601',
      phone: '(864) 555-0123',
      email: 'info@greenvillehealthcare.com',
      licenseNumber: 'HC-2024-001',
      capacity: 50,
      status: 'active',
      isActive: true
    });
    console.log('✅ Test facility created:', testFacility.name);

    // Hash the common password
    const hashedPassword = await bcrypt.hash('password123', 10);
    console.log('🔐 Password hashed for all accounts');

    // Test users data
    const testUsers = [
      // Admin users
      {
        name: 'System Administrator',
        email: 'admin@myhome.com',
        passwordHash: hashedPassword,
        role: 'admin',
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      },
      {
        name: 'Test Admin',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'admin',
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      },

      // Supervisor users
      {
        name: 'Sarah Johnson',
        email: 'supervisor@myhome.com',
        passwordHash: hashedPassword,
        role: 'supervisor',
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      },
      {
        name: 'Test Supervisor',
        email: 'supervisor@example.com',
        passwordHash: hashedPassword,
        role: 'supervisor',
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      },

      // Doctor users
      {
        name: 'Dr. Michael Chen',
        email: 'doctor@myhome.com',
        passwordHash: hashedPassword,
        role: 'doctor',
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      },
      {
        name: 'Dr. Sarah Williams',
        email: 'doctor@example.com',
        passwordHash: hashedPassword,
        role: 'doctor',
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      },

      // Caregiver users
      {
        name: 'Emma Davis',
        email: 'caregiver@myhome.com',
        passwordHash: hashedPassword,
        role: 'caregiver',
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      },
      {
        name: 'Test Caregiver',
        email: 'caregiver@example.com',
        passwordHash: hashedPassword,
        role: 'caregiver',
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      },

      // Facility Owner users
      {
        name: 'Robert Green',
        email: 'owner@myhome.com',
        passwordHash: hashedPassword,
        role: 'supervisor', // Using supervisor role for facility owner functionality
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      },

      // Additional test users for different scenarios
      {
        name: 'Jennifer Martinez',
        email: 'j.martinez@myhome.com',
        passwordHash: hashedPassword,
        role: 'caregiver',
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      },
      {
        name: 'Dr. James Wilson',
        email: 'j.wilson@myhome.com',
        passwordHash: hashedPassword,
        role: 'doctor',
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      },
      {
        name: 'Lisa Thompson',
        email: 'l.thompson@myhome.com',
        passwordHash: hashedPassword,
        role: 'supervisor',
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      }
    ];

    // Create all test users
    console.log('👥 Creating test users...');
    const createdUsers = await User.bulkCreate(testUsers);
    console.log(`✅ Created ${createdUsers.length} test users`);

    // Update facility owner
    const facilityOwner = createdUsers.find(user => user.email === 'owner@myhome.com');
    if (facilityOwner) {
      await testFacility.update({ ownerId: facilityOwner.id });
      console.log('✅ Facility owner assigned');
    }

    // Display created accounts
    console.log('\n📋 Test Accounts Created:');
    console.log('================================');
    console.log('🔑 Password for ALL accounts: password123');
    console.log('🏥 Facility: Greenville Healthcare Center');
    console.log('');

    // Group by role
    const usersByRole = {};
    createdUsers.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });

    Object.keys(usersByRole).forEach(role => {
      console.log(`\n${role.toUpperCase()} ACCOUNTS:`);
      usersByRole[role].forEach(user => {
        console.log(`  📧 ${user.email} (${user.name})`);
      });
    });

    console.log('\n🎯 Quick Test Credentials:');
    console.log('==========================');
    console.log('Admin:     admin@myhome.com / password123');
    console.log('Supervisor: supervisor@myhome.com / password123');
    console.log('Doctor:    doctor@myhome.com / password123');
    console.log('Caregiver: caregiver@myhome.com / password123');
    console.log('Owner:     owner@myhome.com / password123');

    console.log('\n✅ Test accounts seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding test accounts:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the seeding if called directly
if (require.main === module) {
  seedTestAccounts()
    .then(() => {
      console.log('🎉 Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedTestAccounts;
