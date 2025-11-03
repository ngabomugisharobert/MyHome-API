const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const Facility = require('../models/Facility');

const createFacilityOwner = async () => {
  try {
    console.log('Creating Facility Owner user (using supervisor role)...');
    
    // Get the first facility
    const facility = await Facility.findOne();
    if (!facility) {
      console.error('❌ No facilities found. Please create a facility first.');
      return;
    }
    
    console.log('Using facility:', facility.name, '(ID:', facility.id, ')');
    
    const hashedPassword = await bcrypt.hash('facility123', 12);
    
    // Create or update facility owner using supervisor role
    const [user, created] = await User.findOrCreate({
      where: { email: 'owner@greenvillehealthcare.com' },
      defaults: {
        name: 'Facility Owner',
        email: 'owner@greenvillehealthcare.com',
        passwordHash: hashedPassword,
        role: 'supervisor', // Use supervisor role for now
        facilityId: facility.id,
        isActive: true,
        emailVerified: true
      }
    });
    
    if (!created) {
      // Update existing user
      await user.update({
        passwordHash: hashedPassword,
        role: 'supervisor',
        facilityId: facility.id,
        isActive: true,
        emailVerified: true
      });
    }
    
    console.log('✅ Facility Owner created/updated:', {
      name: user.name,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId
    });
    console.log('\nLogin credentials:');
    console.log('Email: owner@greenvillehealthcare.com');
    console.log('Password: facility123');
    console.log('Facility ID:', user.facilityId);
    console.log('\nNote: Using supervisor role for now. RBAC will filter by facility.');
    
  } catch (error) {
    console.error('❌ Error creating Facility Owner:', error);
  } finally {
    await sequelize.close();
  }
};

createFacilityOwner();
