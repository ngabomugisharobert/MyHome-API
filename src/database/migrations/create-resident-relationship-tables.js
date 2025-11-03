const { sequelize } = require('../../config/database');

async function createResidentRelationshipTables() {
  try {
    console.log('🏥 Creating resident relationship tables...');

    // Create ENUM types
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE document_type AS ENUM ('assessment', 'report', 'consent_form', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE alert_type AS ENUM ('medication_missed', 'vital_abnormal', 'medication_due', 'appointment', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE vital_type AS ENUM ('blood_pressure', 'heart_rate', 'weight', 'temperature', 'blood_sugar', 'oxygen_saturation', 'respiratory_rate', 'pain_level', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create resident_documents table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS resident_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
        document_type document_type NOT NULL DEFAULT 'other',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_url VARCHAR(500) NOT NULL,
        file_name VARCHAR(255),
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        document_date DATE,
        expiration_date DATE,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if medication_schedules table exists
    const [medScheduleCheck] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'medication_schedules'
      );
    `);
    const medicationSchedulesExists = medScheduleCheck[0].exists;

    // Create resident_medications table (links residents to their medication schedules)
    if (medicationSchedulesExists) {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS resident_medications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
          medication_schedule_id UUID NOT NULL REFERENCES medication_schedules(id) ON DELETE CASCADE,
          start_date DATE NOT NULL,
          end_date DATE,
          status VARCHAR(50) DEFAULT 'active',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(resident_id, medication_schedule_id)
        );
      `);
    } else {
      console.log('⚠️ medication_schedules table does not exist. Creating resident_medications without foreign key constraint.');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS resident_medications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
          medication_schedule_id UUID NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE,
          status VARCHAR(50) DEFAULT 'active',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(resident_id, medication_schedule_id)
        );
      `);
      console.log('✅ resident_medications table created (foreign key will be added when medication_schedules table exists)');
    }

    // Create resident_vitals table (needed before alerts)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS resident_vitals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
        vital_type vital_type NOT NULL,
        value NUMERIC(10, 2) NOT NULL,
        unit VARCHAR(20),
        systolic INTEGER,
        diastolic INTEGER,
        measured_by UUID REFERENCES users(id) ON DELETE SET NULL,
        measurement_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        is_abnormal BOOLEAN DEFAULT false,
        abnormal_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create resident_alerts table (after vitals, since it references vitals)
    // Build the query based on which tables exist
    let alertsTableQuery = `
      CREATE TABLE IF NOT EXISTS resident_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
        alert_type alert_type NOT NULL,
        severity alert_severity NOT NULL DEFAULT 'medium',
        status alert_status NOT NULL DEFAULT 'active',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
    `;
    
    // Add foreign keys only if tables exist
    if (medicationSchedulesExists) {
      alertsTableQuery += `related_medication_id UUID REFERENCES medication_schedules(id) ON DELETE SET NULL,`;
    } else {
      alertsTableQuery += `related_medication_id UUID,`;
    }
    
    alertsTableQuery += `
        related_vital_id UUID REFERENCES resident_vitals(id) ON DELETE SET NULL,
        triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
        acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        resolution_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await sequelize.query(alertsTableQuery);

    // Create indexes for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_resident_documents_resident ON resident_documents(resident_id);
      CREATE INDEX IF NOT EXISTS idx_resident_documents_type ON resident_documents(document_type);
      CREATE INDEX IF NOT EXISTS idx_resident_documents_date ON resident_documents(document_date);
      
      CREATE INDEX IF NOT EXISTS idx_resident_medications_resident ON resident_medications(resident_id);
      CREATE INDEX IF NOT EXISTS idx_resident_medications_schedule ON resident_medications(medication_schedule_id);
      CREATE INDEX IF NOT EXISTS idx_resident_medications_status ON resident_medications(status);
      
      CREATE INDEX IF NOT EXISTS idx_resident_alerts_resident ON resident_alerts(resident_id);
      CREATE INDEX IF NOT EXISTS idx_resident_alerts_type ON resident_alerts(alert_type);
      CREATE INDEX IF NOT EXISTS idx_resident_alerts_status ON resident_alerts(status);
      CREATE INDEX IF NOT EXISTS idx_resident_alerts_severity ON resident_alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_resident_alerts_created ON resident_alerts(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_resident_vitals_resident ON resident_vitals(resident_id);
      CREATE INDEX IF NOT EXISTS idx_resident_vitals_type ON resident_vitals(vital_type);
      CREATE INDEX IF NOT EXISTS idx_resident_vitals_time ON resident_vitals(measurement_time);
      CREATE INDEX IF NOT EXISTS idx_resident_vitals_abnormal ON resident_vitals(is_abnormal);
    `);

    console.log('✅ Resident relationship tables created successfully!');
    console.log('  - resident_documents');
    console.log('  - resident_medications');
    console.log('  - resident_alerts');
    console.log('  - resident_vitals');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating resident relationship tables:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  createResidentRelationshipTables()
    .then(() => {
      console.log('Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createResidentRelationshipTables;

