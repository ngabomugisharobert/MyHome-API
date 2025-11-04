const { sequelize } = require('../../config/database');

/**
 * Migration: Remove 'name' column from residents table
 * 
 * This removes the legacy 'name' field as we now use firstName and lastName.
 */
async function removeNameFromResidents() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('🗑️  Removing legacy "name" column from residents table...');

    // Check if column exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'residents' AND column_name = 'name';
    `);

    if (results.length === 0) {
      console.log('ℹ️  "name" column does not exist, skipping...');
      return { success: true, message: 'Column already removed' };
    }

    // Drop the column
    await queryInterface.removeColumn('residents', 'name');
    
    console.log('✅ Successfully removed "name" column from residents table');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error removing name column:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  removeNameFromResidents()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = removeNameFromResidents;


