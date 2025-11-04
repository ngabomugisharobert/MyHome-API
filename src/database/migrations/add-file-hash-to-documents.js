const { sequelize } = require('../../config/database');

async function addFileHashToDocuments() {
  try {
    console.log('🧩 Adding file_hash column and indexes to documents...');

    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_hash VARCHAR(128);
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Index on file_hash for faster duplicate checks
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON documents(file_hash);
    `);

    // Unique per resident to prevent exact duplicates for the same resident
    await sequelize.query(`
      DO $$ BEGIN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_resident_file_hash
        ON documents(resident_id, file_hash)
        WHERE resident_id IS NOT NULL AND file_hash IS NOT NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Unique per facility for facility-level docs (resident_id NULL)
    await sequelize.query(`
      DO $$ BEGIN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_facility_file_hash
        ON documents(facility_id, file_hash)
        WHERE resident_id IS NULL AND file_hash IS NOT NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    console.log('✅ file_hash column and indexes added');
    return { success: true };
  } catch (error) {
    console.error('❌ Error adding file_hash to documents:', error);
    throw error;
  }
}

if (require.main === module) {
  addFileHashToDocuments()
    .then((result) => {
      if (result.success) {
        console.log('✅ Migration completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Migration failed:', result.message);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Unhandled migration error:', error);
      process.exit(1);
    });
}

module.exports = addFileHashToDocuments;


