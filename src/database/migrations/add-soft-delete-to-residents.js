const { sequelize } = require('../../config/database');

async function addSoftDeleteToResidents() {
  try {
    console.log('🔄 Adding soft delete support to residents table...');

    // Check if deleted_at column already exists
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'residents' 
      AND column_name = 'deleted_at';
    `);

    if (columns.length === 0) {
      await sequelize.query(`
        ALTER TABLE residents 
        ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
      `);

      // Create index for soft delete queries
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_residents_deleted_at ON residents(deleted_at);
      `);

      console.log('✅ Added deleted_at column to residents table');
    } else {
      console.log('ℹ️  deleted_at column already exists');
    }

    console.log('✅ Soft delete support added successfully!');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error adding soft delete:', error);
    throw error;
  }
}

if (require.main === module) {
  addSoftDeleteToResidents()
    .then(() => {
      console.log('Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addSoftDeleteToResidents;

