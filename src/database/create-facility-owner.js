const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const User = require('../models/User');

const createFacilityOwner = async () => {
  try {
    console.log('Creating Facility Owner user...');
    
    // Get the facility ID from the existing facility
    const [facilityResult] = await sequelize.query('SELECT id FROM facilities LIMIT 1');
    const facilityId = facilityResult[0].id;
    
    console.log('Using facility ID:', facilityId);
    
    const hashedPassword = await bcrypt.hash('facility123', 12);
    
    const [result] = await sequelize.query(`
      INSERT INTO users (id, name, email, password_hash, role, facility_id, is_active, email_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        facility_id = EXCLUDED.facility_id,
        updated_at = EXCLUDED.updated_at
      RETURNING id, name, email, role, facility_id
    `, [
      'facility-owner-id-123',
      'Facility Owner',
      'owner@greenvillehealthcare.com',
      hashedPassword,
      'facility_owner',
      facilityId,
      true,
      true,
      new Date(),
      new Date()
    ]);
    
    console.log('✅ Facility Owner created/updated:', result[0]);
    console.log('Login credentials:');
    console.log('Email: owner@greenvillehealthcare.com');
    console.log('Password: facility123');
    console.log('Facility ID:', result[0].facility_id);
    
  } catch (error) {
    console.error('❌ Error creating Facility Owner:', error);
  } finally {
    await sequelize.close();
  }
};

createFacilityOwner();
