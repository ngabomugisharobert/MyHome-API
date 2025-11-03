const { sequelize } = require('../config/database');

const checkSchema = async () => {
  try {
    console.log('Checking database schema...');
    
    // Check users table structure
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns:');
    results.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if there are any existing users
    const [userCount] = await sequelize.query('SELECT COUNT(*) as count FROM users');
    console.log(`\nExisting users: ${userCount[0].count}`);
    
    if (userCount[0].count > 0) {
      const [sampleUser] = await sequelize.query('SELECT * FROM users LIMIT 1');
      console.log('\nSample user data:');
      console.log(JSON.stringify(sampleUser[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await sequelize.close();
  }
};

checkSchema();
