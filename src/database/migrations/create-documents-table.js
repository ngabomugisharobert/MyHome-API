const { sequelize } = require('../../config/database');

async function createDocumentsTable() {
  try {
    console.log('📄 Creating documents table...');

    // Create document category ENUM type
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE document_category AS ENUM ('license', 'insurance', 'compliance', 'medical', 'administrative', 'legal', 'financial');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create documents table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category document_category NOT NULL DEFAULT 'administrative',
        file_path VARCHAR(500) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
        uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        expiry_date TIMESTAMP WITH TIME ZONE,
        is_confidential BOOLEAN DEFAULT false,
        tags JSONB DEFAULT '[]'::jsonb,
        version VARCHAR(50) DEFAULT '1.0',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_facility ON documents(facility_id);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_resident ON documents(resident_id);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON documents(expiry_date);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
    `);

    console.log('✅ Documents table created successfully');
    console.log('  - documents table with all required fields');
    console.log('  - Indexes created for facility_id, resident_id, category, uploaded_by, expiry_date, created_at');

    return { success: true };
  } catch (error) {
    console.error('❌ Error creating documents table:', error);
    throw error;
  }
}

if (require.main === module) {
  createDocumentsTable()
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

module.exports = createDocumentsTable;


