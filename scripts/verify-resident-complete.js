const { sequelize } = require('../../src/config/database');
const Resident = require('../../src/models/Resident');

async function verifyComplete() {
  try {
    await sequelize.authenticate();
    
    // Database schema
    const [dbColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'residents' 
      ORDER BY ordinal_position;
    `);

    // Model fields
    const modelFields = Object.keys(Resident.rawAttributes);
    
    // Expected frontend form fields (from formData)
    const frontendFields = [
      'firstName', 'lastName', 'dob', 'gender', 'photoUrl', 'admissionDate', 
      'dischargeDate', 'roomNumber', 'primaryPhysician', 'emergencyContactName',
      'emergencyContactPhone', 'diagnosis', 'allergies', 'dietaryRestrictions',
      'mobilityLevel', 'careLevel', 'insuranceProvider', 'policyNumber', 'status'
    ];

    console.log('\n📊 COMPREHENSIVE VERIFICATION REPORT\n');
    console.log('═'.repeat(80));
    
    // 1. Database to Model mapping
    console.log('\n1️⃣ DATABASE → MODEL MAPPING:');
    console.log('─'.repeat(80));
    dbColumns.forEach(col => {
      const modelField = modelFields.find(f => {
        const attr = Resident.rawAttributes[f];
        return attr && (attr.field === col.column_name || f === col.column_name);
      });
      const status = modelField ? '✅' : '❌';
      console.log(`  ${status} ${col.column_name.padEnd(30)} → ${modelField || 'NOT MAPPED'}`);
    });

    // 2. Model to Frontend mapping
    console.log('\n2️⃣ MODEL → FRONTEND MAPPING:');
    console.log('─'.repeat(80));
    modelFields.forEach(field => {
      if (['id', 'createdAt', 'updatedAt', 'deletedAt', 'name'].includes(field)) return;
      const inFrontend = frontendFields.includes(field);
      const status = inFrontend ? '✅' : '⚠️ ';
      console.log(`  ${status} ${field.padEnd(30)} ${inFrontend ? '→ FORM' : '→ MISSING'}`);
    });

    // 3. Frontend to Model mapping
    console.log('\n3️⃣ FRONTEND → MODEL MAPPING:');
    console.log('─'.repeat(80));
    frontendFields.forEach(field => {
      const inModel = modelFields.includes(field);
      const status = inModel ? '✅' : '❌';
      console.log(`  ${status} ${field.padEnd(30)} ${inModel ? '→ MODEL' : '→ NOT IN MODEL'}`);
    });

    // 4. Required fields check
    console.log('\n4️⃣ REQUIRED FIELDS:');
    console.log('─'.repeat(80));
    const dbRequired = dbColumns.filter(c => c.is_nullable === 'NO' && !['id', 'name'].includes(c.column_name));
    const modelRequired = modelFields.filter(f => {
      const attr = Resident.rawAttributes[f];
      return attr && attr.allowNull === false && f !== 'id';
    });
    console.log(`  Database: ${dbRequired.map(c => c.column_name).join(', ')}`);
    console.log(`  Model: ${modelRequired.join(', ')}`);
    
    // 5. ENUM values check
    console.log('\n5️⃣ ENUM VALUES:');
    console.log('─'.repeat(80));
    const enumFields = ['gender', 'mobilityLevel', 'careLevel', 'status'];
    enumFields.forEach(field => {
      const attr = Resident.rawAttributes[field];
      if (attr && attr.type && attr.type.constructor.name === 'ENUM') {
        console.log(`  ${field}: ${attr.type.values.join(', ')}`);
      }
    });

    await sequelize.close();
    console.log('\n✅ Verification complete\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyComplete();


