const { sequelize } = require('../config/database');

const migrateMinimal = async () => {
  try {
    console.log('Starting minimal migration for new features...');

    // Import all models to register them
    require('../models/User');
    require('../models/Facility');
    require('../models/Role');
    require('../models/TeamMember');
    require('../models/Resident');
    require('../models/AccessRule');

    // Sync all models (only create new tables, don't modify existing ones)
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ All new tables created/updated successfully');

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

    console.log('🎉 Minimal migration completed successfully!');
    console.log('\nNew features available:');
    console.log('- Team Management: /api/team');
    console.log('- Role Management: /api/roles');
    console.log('- Access Management: /api/access');
    console.log('\nNote: You may need to manually create facilities and residents through the API.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateMinimal()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateMinimal;
