const { sequelize } = require('../config/database');
const Role = require('../models/Role');
const TeamMember = require('../models/TeamMember');
const AccessRule = require('../models/AccessRule');
const Resident = require('../models/Resident');

const migrateNewFeatures = async () => {
  try {
    console.log('Starting migration for new features...');

    // Create new tables
    await Role.sync({ force: false });
    console.log('✅ Roles table created/updated');

    await TeamMember.sync({ force: false });
    console.log('✅ Team Members table created/updated');

    await Resident.sync({ force: false });
    console.log('✅ Residents table created/updated');

    await AccessRule.sync({ force: false });
    console.log('✅ Access Rules table created/updated');

    // Create default roles if they don't exist
    const defaultRoles = [
      {
        name: 'Admin',
        description: 'Full system access with all permissions',
        permissions: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        isActive: true
      },
      {
        name: 'Doctor',
        description: 'Medical staff with patient care and reporting access',
        permissions: ['1', '3', '5', '6', '8'],
        isActive: true
      },
      {
        name: 'Caregiver',
        description: 'Patient care staff with limited permissions',
        permissions: ['1', '3', '5', '6'],
        isActive: true
      },
      {
        name: 'Supervisor',
        description: 'Team management with oversight capabilities',
        permissions: ['1', '2', '3', '4', '5', '6', '8'],
        isActive: true
      }
    ];

    for (const roleData of defaultRoles) {
      const [role, created] = await Role.findOrCreate({
        where: { name: roleData.name },
        defaults: roleData
      });
      
      if (created) {
        console.log(`✅ Created default role: ${roleData.name}`);
      } else {
        console.log(`ℹ️  Role already exists: ${roleData.name}`);
      }
    }

    // Create sample residents
    const sampleResidents = [
      {
        name: 'John Smith',
        facilityId: '1', // Assuming facility with ID 1 exists
        room: '101A',
        dateOfBirth: new Date('1950-05-15'),
        medicalRecordNumber: 'MR001',
        status: 'active'
      },
      {
        name: 'Mary Johnson',
        facilityId: '1',
        room: '102B',
        dateOfBirth: new Date('1948-03-22'),
        medicalRecordNumber: 'MR002',
        status: 'active'
      },
      {
        name: 'Robert Davis',
        facilityId: '2', // Assuming facility with ID 2 exists
        room: '201',
        dateOfBirth: new Date('1955-11-08'),
        medicalRecordNumber: 'MR003',
        status: 'active'
      }
    ];

    for (const residentData of sampleResidents) {
      const [resident, created] = await Resident.findOrCreate({
        where: { 
          name: residentData.name,
          facilityId: residentData.facilityId
        },
        defaults: residentData
      });
      
      if (created) {
        console.log(`✅ Created sample resident: ${residentData.name}`);
      } else {
        console.log(`ℹ️  Resident already exists: ${residentData.name}`);
      }
    }

    console.log('🎉 Migration completed successfully!');
    console.log('\nNew features available:');
    console.log('- Team Management: /api/team');
    console.log('- Role Management: /api/roles');
    console.log('- Access Management: /api/access');
    console.log('- Residents: /api/residents (if you create the route)');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateNewFeatures()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateNewFeatures;
