const { sequelize } = require('../config/database');

const checkUsers = async () => {
  try {
    console.log('Checking existing users...');
    
    const [users] = await sequelize.query('SELECT id, name, email, role FROM users');
    
    console.log('Existing users:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    
    // Check if doctor@myhome.com exists
    const [doctorUser] = await sequelize.query(
      'SELECT id, name, email, role FROM users WHERE email = $1',
      ['doctor@myhome.com']
    );
    
    if (doctorUser.length > 0) {
      console.log('\nDoctor user found:', doctorUser[0]);
    } else {
      console.log('\nDoctor user not found. Available emails:');
      users.forEach(user => {
        console.log(`- ${user.email}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await sequelize.close();
  }
};

checkUsers();
