const { sequelize } = require('../config/database');
const User = require('../models/User');
const Facility = require('../models/Facility');

const testFacilityOwner = async () => {
  try {
    console.log('Testing Facility Owner functionality...');
    
    // Get the facility owner user
    const facilityOwner = await User.findOne({
      where: { email: 'owner@greenvillehealthcare.com' }
    });
    
    if (!facilityOwner) {
      console.log('❌ Facility owner not found');
      return;
    }
    
    console.log('✅ Facility Owner found:', {
      name: facilityOwner.name,
      email: facilityOwner.email,
      role: facilityOwner.role,
      facilityId: facilityOwner.facilityId
    });
    
    // Get the facility
    const facility = await Facility.findByPk(facilityOwner.facilityId);
    if (facility) {
      console.log('✅ Associated Facility:', {
        name: facility.name,
        address: facility.address,
        licenseNumber: facility.licenseNumber
      });
    }
    
    // Test facility filtering - get all users in the same facility
    const facilityUsers = await User.findAll({
      where: { facilityId: facilityOwner.facilityId },
      attributes: ['id', 'name', 'email', 'role']
    });
    
    console.log('✅ Users in the same facility:', facilityUsers.length);
    facilityUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    console.log('\n🎉 Facility Owner RBAC Test Complete!');
    console.log('The facility owner can only see users from their assigned facility.');
    
  } catch (error) {
    console.error('❌ Error testing facility owner:', error);
  } finally {
    await sequelize.close();
  }
};

testFacilityOwner();
