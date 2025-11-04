const { sequelize } = require('../../config/database');

/**
 * Migration: Remove legacy 'facilityId' (camelCase) column from residents table
 * 
 * This removes the duplicate legacy column as we now use facility_id (snake_case).
 * The model correctly maps facilityId -> facility_id, so we only need facility_id in the database.
 */
async function removeLegacyFacilityIdColumn() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('🔍 Checking for legacy facilityId column...');

    // Check if legacy column exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'residents' AND column_name = 'facilityId';
    `);

    if (results.length === 0) {
      console.log('ℹ️  Legacy "facilityId" column does not exist, skipping...');
      return { success: true, message: 'Column already removed' };
    }

    console.log('⚠️  Found legacy "facilityId" column. Syncing data if needed...');

    // Sync data from facility_id to facilityId for any records where facilityId is null
    // (just in case there are any records with mismatched data)
    await sequelize.query(`
      UPDATE residents 
      SET "facilityId" = facility_id 
      WHERE "facilityId" IS NULL AND facility_id IS NOT NULL;
    `);

    console.log('🔄 Data synced. Dropping legacy column...');

    // Drop the legacy column
    await queryInterface.removeColumn('residents', 'facilityId');
    
    console.log('✅ Successfully removed legacy "facilityId" column from residents table');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error removing legacy facilityId column:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  removeLegacyFacilityIdColumn()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = removeLegacyFacilityIdColumn;


