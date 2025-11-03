const { sequelize } = require('../../config/database');

async function createResidentsTable() {
  try {
    console.log('🏥 Creating residents table with full schema...');

    // Create ENUM types first
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE resident_gender AS ENUM ('male', 'female', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE resident_status AS ENUM ('active', 'inactive', 'discharged');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE mobility_level AS ENUM ('independent', 'assisted', 'wheelchair', 'bedridden');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE care_level AS ENUM ('independent', 'assisted_living', 'memory_care', 'skilled_nursing', 'hospice');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create residents table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS residents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        dob DATE,
        gender resident_gender,
        photo_url VARCHAR(500),
        admission_date TIMESTAMP WITH TIME ZONE,
        discharge_date TIMESTAMP WITH TIME ZONE,
        room_number VARCHAR(50),
        facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        primary_physician UUID REFERENCES users(id) ON DELETE SET NULL,
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(20),
        diagnosis TEXT,
        allergies TEXT,
        dietary_restrictions TEXT,
        mobility_level mobility_level,
        care_level care_level,
        insurance_provider VARCHAR(255),
        policy_number VARCHAR(100),
        status resident_status NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes (check if table exists first)
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_residents_facility ON residents(facility_id);
      `);
    } catch (err) {
      console.log('Note: Could not create facility_id index (column may not exist or index already exists)');
    }
    
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_residents_physician ON residents(primary_physician);
      `);
    } catch (err) {
      console.log('Note: Could not create primary_physician index');
    }
    
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_residents_status ON residents(status);
      `);
    } catch (err) {
      console.log('Note: Could not create status index');
    }
    
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_residents_name ON residents(first_name, last_name);
      `);
    } catch (err) {
      console.log('Note: Could not create name index');
    }

    console.log('✅ Residents table created successfully!');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating residents table:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  createResidentsTable()
    .then(() => {
      console.log('Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createResidentsTable;

