const { sequelize } = require('../../config/database');

const addFacilityManagementFields = async () => {
  try {
    console.log('🔄 Adding facility management fields...');

    // Add owner_id column
    await sequelize.query(`
      ALTER TABLE facilities 
      ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id)
    `);

    // Add capacity column
    await sequelize.query(`
      ALTER TABLE facilities 
      ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0
    `);

    // Add status column with ENUM
    await sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'facility_status') THEN
          CREATE TYPE facility_status AS ENUM ('active', 'inactive', 'pending');
        END IF;
      END $$;
    `);

    await sequelize.query(`
      ALTER TABLE facilities 
      ADD COLUMN IF NOT EXISTS status facility_status DEFAULT 'pending'
    `);

    // Update existing facilities to have 'active' status
    await sequelize.query(`
      UPDATE facilities 
      SET status = 'active' 
      WHERE status IS NULL AND is_active = true
    `);

    await sequelize.query(`
      UPDATE facilities 
      SET status = 'inactive' 
      WHERE status IS NULL AND is_active = false
    `);

    console.log('✅ Facility management fields added successfully');
  } catch (error) {
    console.error('❌ Error adding facility management fields:', error);
    throw error;
  }
};

// Run the migration if called directly
if (require.main === module) {
  addFacilityManagementFields()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addFacilityManagementFields;
