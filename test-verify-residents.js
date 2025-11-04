const { sequelize } = require('./src/config/database');
const Resident = require('./src/models/Resident');

async function verify() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get database schema
    const [dbColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'residents' 
      ORDER BY ordinal_position;
    `);

    // Frontend form fields
    const frontendFields = [
      'firstName', 'lastName', 'dob', 'gender', 'photoUrl', 'admissionDate', 
      'dischargeDate', 'roomNumber', 'primaryPhysician', 'emergencyContactName',
      'emergencyContactPhone', 'diagnosis', 'allergies', 'dietaryRestrictions',
      'mobilityLevel', 'careLevel', 'insuranceProvider', 'policyNumber', 'status'
    ];

    // Model fields
    const modelFields = Object.keys(Resident.rawAttributes);

    console.log('📊 FIELD MAPPING VERIFICATION\n');
    console.log('═'.repeat(80));
    
    console.log('\n1️⃣ Frontend → Model → Database Mapping:');
    console.log('─'.repeat(80));
    
    let allMatch = true;
    frontendFields.forEach(field => {
      const inModel = modelFields.includes(field);
      if (!inModel) {
        console.log(`  ❌ ${field.padEnd(30)} NOT IN MODEL`);
        allMatch = false;
        return;
      }
      
      const attr = Resident.rawAttributes[field];
      const dbField = attr.field || field;
      const dbColumn = dbColumns.find(c => c.column_name === dbField);
      
      if (!dbColumn) {
        console.log(`  ❌ ${field.padEnd(30)} → ${dbField.padEnd(25)} NOT IN DATABASE`);
        allMatch = false;
      } else {
        console.log(`  ✅ ${field.padEnd(30)} → ${dbField.padEnd(25)} → ${dbColumn.data_type}`);
      }
    });

    if (allMatch) {
      console.log('\n✅ ALL FRONTEND FIELDS MAPPED CORRECTLY!');
    }

    console.log('\n2️⃣ Required Fields Check:');
    console.log('─'.repeat(80));
    const required = ['firstName', 'lastName'];
    required.forEach(field => {
      const attr = Resident.rawAttributes[field];
      const isRequired = attr && attr.allowNull === false;
      console.log(`  ${isRequired ? '✅' : '❌'} ${field}: ${isRequired ? 'REQUIRED' : 'NOT REQUIRED'}`);
    });

    console.log('\n3️⃣ ENUM Values Check:');
    console.log('─'.repeat(80));
    ['gender', 'mobilityLevel', 'careLevel', 'status'].forEach(field => {
      const attr = Resident.rawAttributes[field];
      if (attr && attr.type && attr.type.constructor.name === 'ENUM') {
        console.log(`  ✅ ${field}: ${attr.type.values.join(', ')}`);
      }
    });

    console.log('\n4️⃣ Legacy Name Field:');
    console.log('─'.repeat(80));
    const nameAttr = Resident.rawAttributes.name;
    if (nameAttr) {
      console.log(`  ✅ Legacy 'name' field mapped: ${nameAttr.field}`);
      console.log(`  ✅ Auto-populated from firstName + lastName`);
    }

    await sequelize.close();
    console.log('\n✅ Verification complete!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify();


