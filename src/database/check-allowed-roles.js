const { sequelize } = require('../config/database');

const checkAllowedRoles = async () => {
  try {
    console.log('Checking allowed roles in users table...');
    
    // Check the constraint definition
    const [constraintResult] = await sequelize.query(`
      SELECT conname, consrc 
      FROM pg_constraint 
      WHERE conname = 'users_role_check'
    `);
    
    if (constraintResult.length > 0) {
      console.log('Role constraint:', constraintResult[0].consrc);
    }
    
    // Check existing users and their roles
    const [users] = await sequelize.query('SELECT DISTINCT role FROM users');
    console.log('\nExisting roles in users table:');
    users.forEach(user => {
      console.log('-', user.role);
    });
    
  } catch (error) {
    console.error('Error checking roles:', error);
  } finally {
    await sequelize.close();
  }
};

checkAllowedRoles();
