const { sequelize } = require('../config/database');
const Role = require('../models/Role');

const seedFacilityOwnerRole = async () => {
  try {
    console.log('Creating Facility Owner role...');
    
    // Define Facility Owner role with facility-scoped permissions
    const facilityOwnerRole = {
      name: 'Facility Owner',
      description: 'Facility owner with access to their specific facility data only',
      permissions: [
        "1", // View residents
        "3", // View facilities (own facility only)
        "5", // View reports (own facility only)
        "6", // View users (own facility only)
        "7", // Manage residents (own facility only)
        "8", // View analytics (own facility only)
      ]
    };

    const [role, created] = await Role.findOrCreate({
      where: { name: 'Facility Owner' },
      defaults: facilityOwnerRole,
    });

    if (created) {
      console.log('✅ Created Facility Owner role:', role.name);
      console.log('Permissions:', role.permissions);
    } else {
      console.log('ℹ️  Facility Owner role already exists');
    }

    console.log('\nFacility Owner permissions:');
    console.log('- View residents (own facility)');
    console.log('- View facilities (own facility only)');
    console.log('- View reports (own facility only)');
    console.log('- View users (own facility only)');
    console.log('- Manage residents (own facility only)');
    console.log('- View analytics (own facility only)');

  } catch (error) {
    console.error('❌ Error creating Facility Owner role:', error);
  } finally {
    await sequelize.close();
  }
};

seedFacilityOwnerRole();
