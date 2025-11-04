const { sequelize } = require('../../config/database');

async function updateResidentsTableSchema() {
  try {
    console.log('🔄 Updating residents table schema...');

    // Check if table exists
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'residents'
      );
    `);

    if (!results[0].exists) {
      console.log('⚠️ Residents table does not exist. Please run create-residents-table.js first.');
      return { success: false, message: 'Table does not exist' };
    }

    // Get current columns
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'residents';
    `);

    const existingColumns = columns.map(col => col.column_name);
    console.log('Current columns:', existingColumns.join(', '));

    // Create ENUM types if they don't exist
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

    // Add missing columns
    const columnsToAdd = [
      { name: 'first_name', type: 'VARCHAR(255)', nullable: false, after: 'id' },
      { name: 'last_name', type: 'VARCHAR(255)', nullable: false },
      { name: 'dob', type: 'DATE', nullable: true },
      { name: 'gender', type: 'resident_gender', nullable: true },
      { name: 'photo_url', type: 'VARCHAR(500)', nullable: true },
      { name: 'admission_date', type: 'TIMESTAMP WITH TIME ZONE', nullable: true },
      { name: 'discharge_date', type: 'TIMESTAMP WITH TIME ZONE', nullable: true },
      { name: 'room_number', type: 'VARCHAR(50)', nullable: true },
      { name: 'facility_id', type: 'UUID', nullable: false, ref: 'facilities(id)' },
      { name: 'primary_physician', type: 'UUID', nullable: true, ref: 'users(id)' },
      { name: 'emergency_contact_name', type: 'VARCHAR(255)', nullable: true },
      { name: 'emergency_contact_phone', type: 'VARCHAR(20)', nullable: true },
      { name: 'diagnosis', type: 'TEXT', nullable: true },
      { name: 'allergies', type: 'TEXT', nullable: true },
      { name: 'dietary_restrictions', type: 'TEXT', nullable: true },
      { name: 'mobility_level', type: 'mobility_level', nullable: true },
      { name: 'care_level', type: 'care_level', nullable: true },
      { name: 'insurance_provider', type: 'VARCHAR(255)', nullable: true },
      { name: 'policy_number', type: 'VARCHAR(100)', nullable: true },
      { name: 'status', type: 'resident_status', nullable: false, defaultValue: "'active'" },
    ];

    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        let sql = `ALTER TABLE residents ADD COLUMN ${col.name} ${col.type}`;
        
        if (!col.nullable && col.name === 'facility_id') {
          // For facility_id, we need to handle existing rows
          sql = `ALTER TABLE residents ADD COLUMN ${col.name} ${col.type}`;
          await sequelize.query(sql);
          // Set a default value for existing rows if needed
          const [facilities] = await sequelize.query('SELECT id FROM facilities LIMIT 1');
          if (facilities.length > 0) {
            await sequelize.query(`UPDATE residents SET ${col.name} = '${facilities[0].id}' WHERE ${col.name} IS NULL`);
          }
          await sequelize.query(`ALTER TABLE residents ALTER COLUMN ${col.name} SET NOT NULL`);
        } else if (!col.nullable && col.name !== 'facility_id') {
          sql += ` DEFAULT ${col.defaultValue || "''"}`;
          await sequelize.query(sql);
          await sequelize.query(`ALTER TABLE residents ALTER COLUMN ${col.name} SET NOT NULL`);
        } else {
          await sequelize.query(sql);
        }

        if (col.ref) {
          const [refTable, refCol] = col.ref.replace(')', '').split('(');
          try {
            await sequelize.query(`
              ALTER TABLE residents 
              ADD CONSTRAINT fk_residents_${col.name.replace(/_/g, '')} 
              FOREIGN KEY (${col.name}) 
              REFERENCES ${refTable}(${refCol}) 
              ON DELETE ${col.name === 'facility_id' ? 'CASCADE' : 'SET NULL'};
            `);
          } catch (err) {
            console.log(`Note: Could not add foreign key for ${col.name}`);
          }
        }

        console.log(`✅ Added column: ${col.name}`);
      } else {
        console.log(`ℹ️  Column already exists: ${col.name}`);
      }
    }

    // Migrate data if 'name' column exists and we need to split it
    if (existingColumns.includes('name') && !existingColumns.includes('first_name')) {
      console.log('📋 Migrating name to first_name and last_name...');
      await sequelize.query(`
        UPDATE residents 
        SET first_name = COALESCE(SUBSTRING(name FROM 1 FOR POSITION(' ' IN name) - 1), name),
            last_name = COALESCE(SUBSTRING(name FROM POSITION(' ' IN name) + 1), '')
        WHERE first_name IS NULL OR last_name IS NULL;
      `);
    }

    // Create indexes
    const indexes = [
      { name: 'idx_residents_facility', column: 'facility_id' },
      { name: 'idx_residents_physician', column: 'primary_physician' },
      { name: 'idx_residents_status', column: 'status' },
      { name: 'idx_residents_name', columns: ['first_name', 'last_name'] }
    ];

    for (const idx of indexes) {
      try {
        if (idx.columns) {
          await sequelize.query(`
            CREATE INDEX IF NOT EXISTS ${idx.name} ON residents(${idx.columns.join(', ')});
          `);
        } else {
          await sequelize.query(`
            CREATE INDEX IF NOT EXISTS ${idx.name} ON residents(${idx.column});
          `);
        }
        console.log(`✅ Created index: ${idx.name}`);
      } catch (err) {
        console.log(`Note: Could not create index ${idx.name}`);
      }
    }

    console.log('✅ Residents table schema updated successfully!');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating residents table schema:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  updateResidentsTableSchema()
    .then(() => {
      console.log('Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = updateResidentsTableSchema;


