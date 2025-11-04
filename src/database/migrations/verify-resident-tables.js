const { sequelize } = require('../../config/database');

async function verifyResidentTables() {
  try {
    console.log('🔍 Verifying resident tables and schema...\n');

    // Check resident-related tables
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'resident%' 
      ORDER BY table_name;
    `);

    console.log('📋 Resident-related tables found:');
    tables.forEach(t => console.log(`  ✅ ${t.table_name}`));
    console.log(`\nTotal: ${tables.length} table(s)\n`);

    // Check residents table columns
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'residents' 
      ORDER BY ordinal_position;
    `);

    console.log('📋 Residents table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    console.log(`\nTotal: ${columns.length} column(s)\n`);

    // Verify key fields
    const requiredFields = [
      'id', 'first_name', 'last_name', 'dob', 'gender', 'photo_url',
      'admission_date', 'discharge_date', 'room_number', 'facility_id',
      'primary_physician', 'emergency_contact_name', 'emergency_contact_phone',
      'diagnosis', 'allergies', 'dietary_restrictions', 'mobility_level',
      'care_level', 'insurance_provider', 'policy_number', 'status',
      'created_at', 'updated_at'
    ];

    const existingFields = columns.map(c => c.column_name);
    const missingFields = requiredFields.filter(f => !existingFields.includes(f));

    if (missingFields.length === 0) {
      console.log('✅ All required fields present in residents table!\n');
    } else {
      console.log('⚠️  Missing fields:', missingFields.join(', '), '\n');
    }

    // Check relationship tables
    const relationshipTables = [
      'resident_documents',
      'resident_medications', 
      'resident_alerts',
      'resident_vitals'
    ];

    console.log('📋 Relationship tables status:');
    for (const tableName of relationshipTables) {
      const [tableCheck] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        );
      `);
      
      if (tableCheck[0].exists) {
        console.log(`  ✅ ${tableName}`);
      } else {
        console.log(`  ❌ ${tableName} - NOT FOUND`);
      }
    }

    console.log('\n✅ Verification completed!');
    
    await sequelize.close();
    return { success: true };
  } catch (error) {
    console.error('❌ Verification error:', error);
    throw error;
  }
}

if (require.main === module) {
  verifyResidentTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = verifyResidentTables;


