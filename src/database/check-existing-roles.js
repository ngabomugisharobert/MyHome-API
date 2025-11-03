const { sequelize } = require('../config/database');

const checkExistingRoles = async () => {
  try {
    console.log('Checking existing roles in users table...');
    
    // Check existing users and their roles
    const [users] = await sequelize.query('SELECT DISTINCT role FROM users');
    console.log('Existing roles in users table:');
    users.forEach(user => {
      console.log('-', user.role);
    });
    
  } catch (error) {
    console.error('Error checking roles:', error);
  } finally {
    await sequelize.close();
  }
};

checkExistingRoles();
