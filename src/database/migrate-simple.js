const { sequelize } = require('../config/database');

const migrateSimple = async () => {
  try {
    console.log('Starting simple migration for new features...');

    // Import all models to register them
    require('../models/User');
    require('../models/Facility');
    require('../models/Role');
    require('../models/TeamMember');
    require('../models/Resident');
    require('../models/AccessRule');

    // Sync all models
    await sequelize.sync({ force: false });
    console.log('✅ All tables created/updated successfully');

    // Create default roles
    const Role = require('../models/Role');
    
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

    // Create sample facilities
    const Facility = require('../models/Facility');
    
    const sampleFacilities = [
      {
        name: 'Main Healthcare Center',
        location: 'Downtown',
        type: 'Hospital',
        capacity: 100
      },
      {
        name: 'North Branch Clinic',
        location: 'North District',
        type: 'Clinic',
        capacity: 50
      },
      {
        name: 'Senior Living Facility',
        location: 'Suburbs',
        type: 'Assisted Living',
        capacity: 75
      }
    ];

    for (const facilityData of sampleFacilities) {
      const [facility, created] = await Facility.findOrCreate({
        where: { name: facilityData.name },
        defaults: facilityData
      });
      
      if (created) {
        console.log(`✅ Created sample facility: ${facilityData.name}`);
      } else {
        console.log(`ℹ️  Facility already exists: ${facilityData.name}`);
      }
    }

    // Create sample residents
    const Resident = require('../models/Resident');
    
    const sampleResidents = [
      {
        name: 'John Smith',
        facilityId: '1', // Will be updated with actual facility ID
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
        facilityId: '2',
        room: '201',
        dateOfBirth: new Date('1955-11-08'),
        medicalRecordNumber: 'MR003',
        status: 'active'
      }
    ];

    // Get facility IDs first
    const facilities = await Facility.findAll();
    const facilityMap = {};
    facilities.forEach(f => {
      if (f.name === 'Main Healthcare Center') facilityMap['1'] = f.id;
      if (f.name === 'North Branch Clinic') facilityMap['2'] = f.id;
      if (f.name === 'Senior Living Facility') facilityMap['3'] = f.id;
    });

    for (const residentData of sampleResidents) {
      const actualFacilityId = facilityMap[residentData.facilityId];
      if (actualFacilityId) {
        const [resident, created] = await Resident.findOrCreate({
          where: { 
            name: residentData.name,
            facilityId: actualFacilityId
          },
          defaults: {
            ...residentData,
            facilityId: actualFacilityId
          }
        });
        
        if (created) {
          console.log(`✅ Created sample resident: ${residentData.name}`);
        } else {
          console.log(`ℹ️  Resident already exists: ${residentData.name}`);
        }
      }
    }

    console.log('🎉 Simple migration completed successfully!');
    console.log('\nNew features available:');
    console.log('- Team Management: /api/team');
    console.log('- Role Management: /api/roles');
    console.log('- Access Management: /api/access');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateSimple()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateSimple;
