const { sequelize } = require('../config/database');

const checkFacilitiesSchema = async () => {
  try {
    console.log('Checking facilities table schema...');
    
    // Check facilities table structure
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'facilities' 
      ORDER BY ordinal_position
    `);
    
    console.log('Facilities table columns:');
    results.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if there are any existing facilities
    const [facilityCount] = await sequelize.query('SELECT COUNT(*) as count FROM facilities');
    console.log(`\nExisting facilities: ${facilityCount[0].count}`);
    
    if (facilityCount[0].count > 0) {
      const [sampleFacility] = await sequelize.query('SELECT * FROM facilities LIMIT 1');
      console.log('\nSample facility data:');
      console.log(JSON.stringify(sampleFacility[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error checking facilities schema:', error);
  } finally {
    await sequelize.close();
  }
};

checkFacilitiesSchema();
