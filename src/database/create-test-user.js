const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const createTestUser = async () => {
  try {
    console.log('Creating test user...');
    
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const [result] = await sequelize.query(`
      INSERT INTO users (id, name, email, password_hash, role, is_active, email_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        updated_at = EXCLUDED.updated_at
      RETURNING id, name, email, role
    `, [
      'test-user-id-123',
      'Test User',
      'test@myhome.com',
      hashedPassword,
      'admin',
      true,
      true,
      new Date(),
      new Date()
    ]);
    
    console.log('Test user created/updated:', result[0]);
    console.log('You can now login with: test@myhome.com / password123');
    
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await sequelize.close();
  }
};

createTestUser();
