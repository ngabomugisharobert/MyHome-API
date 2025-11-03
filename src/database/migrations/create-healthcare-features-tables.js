const { sequelize } = require('../../config/database');

async function createHealthcareFeaturesTables() {
  try {
    console.log('🏥 Creating healthcare features tables...');

    // Create ENUM types first
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE medication_form AS ENUM ('tablet', 'capsule', 'liquid', 'injection', 'topical', 'inhaler', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE medication_route AS ENUM ('oral', 'intramuscular', 'intravenous', 'subcutaneous', 'topical', 'inhalation', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE medication_status AS ENUM ('active', 'inactive', 'discontinued');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE schedule_status_type AS ENUM ('active', 'completed', 'discontinued', 'on_hold');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE medication_frequency AS ENUM ('once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'as_needed', 'custom');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE schedule_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE schedule_type AS ENUM ('shift', 'appointment', 'task', 'meeting', 'training', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE care_plan_status AS ENUM ('active', 'completed', 'discontinued', 'on_hold');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE care_plan_priority AS ENUM ('low', 'medium', 'high', 'critical');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE care_plan_category AS ENUM ('medical', 'nursing', 'therapy', 'nutrition', 'behavioral', 'social', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE goal_status AS ENUM ('not_started', 'in_progress', 'achieved', 'not_achieved', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE administration_status AS ENUM ('scheduled', 'administered', 'missed', 'refused', 'held');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create medications table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS medications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        "genericName" VARCHAR(255),
        dosage VARCHAR(100) NOT NULL,
        form medication_form NOT NULL DEFAULT 'tablet',
        route medication_route NOT NULL DEFAULT 'oral',
        strength VARCHAR(100),
        manufacturer VARCHAR(255),
        "ndcNumber" VARCHAR(50),
        "facilityId" UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        status medication_status NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create medication_schedules table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS medication_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "residentId" UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
        "medicationId" UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
        "prescribedBy" UUID REFERENCES users(id),
        dosage VARCHAR(100) NOT NULL,
        frequency medication_frequency NOT NULL,
        "customSchedule" JSONB,
        "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endDate" TIMESTAMP WITH TIME ZONE,
        instructions TEXT,
        reason TEXT,
        status schedule_status_type NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create medication_administrations table (MAR)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS medication_administrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "scheduleId" UUID NOT NULL REFERENCES medication_schedules(id) ON DELETE CASCADE,
        "scheduledTime" TIMESTAMP WITH TIME ZONE NOT NULL,
        "administeredTime" TIMESTAMP WITH TIME ZONE,
        "administeredBy" UUID REFERENCES users(id),
        status administration_status NOT NULL DEFAULT 'scheduled',
        notes TEXT,
        "reasonNotGiven" TEXT,
        "doseGiven" VARCHAR(100),
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create care_plans table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS care_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "residentId" UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
        "createdBy" UUID NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        diagnosis TEXT,
        "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endDate" TIMESTAMP WITH TIME ZONE,
        "reviewDate" TIMESTAMP WITH TIME ZONE,
        status care_plan_status NOT NULL DEFAULT 'active',
        priority care_plan_priority NOT NULL DEFAULT 'medium',
        category care_plan_category NOT NULL DEFAULT 'medical',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create care_plan_goals table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS care_plan_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "carePlanId" UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        "targetDate" TIMESTAMP WITH TIME ZONE,
        status goal_status NOT NULL DEFAULT 'not_started',
        progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        measurement TEXT,
        interventions JSONB,
        notes TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create schedules table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type schedule_type NOT NULL,
        "startTime" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endTime" TIMESTAMP WITH TIME ZONE NOT NULL,
        "facilityId" UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        "residentId" UUID REFERENCES residents(id) ON DELETE SET NULL,
        "assignedTo" UUID REFERENCES users(id) ON DELETE SET NULL,
        "createdBy" UUID NOT NULL REFERENCES users(id),
        status schedule_status NOT NULL DEFAULT 'scheduled',
        recurring BOOLEAN NOT NULL DEFAULT false,
        "recurringPattern" JSONB,
        location VARCHAR(255),
        notes TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_medications_facility ON medications("facilityId");
      CREATE INDEX IF NOT EXISTS idx_medication_schedules_resident ON medication_schedules("residentId");
      CREATE INDEX IF NOT EXISTS idx_medication_schedules_medication ON medication_schedules("medicationId");
      CREATE INDEX IF NOT EXISTS idx_medication_administrations_schedule ON medication_administrations("scheduleId");
      CREATE INDEX IF NOT EXISTS idx_medication_administrations_time ON medication_administrations("scheduledTime");
      CREATE INDEX IF NOT EXISTS idx_care_plans_resident ON care_plans("residentId");
      CREATE INDEX IF NOT EXISTS idx_care_plan_goals_plan ON care_plan_goals("carePlanId");
      CREATE INDEX IF NOT EXISTS idx_schedules_facility ON schedules("facilityId");
      CREATE INDEX IF NOT EXISTS idx_schedules_resident ON schedules("residentId");
      CREATE INDEX IF NOT EXISTS idx_schedules_assigned ON schedules("assignedTo");
      CREATE INDEX IF NOT EXISTS idx_schedules_time ON schedules("startTime", "endTime");
    `);

    console.log('✅ Healthcare features tables created successfully!');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating healthcare features tables:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  createHealthcareFeaturesTables()
    .then(() => {
      console.log('Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createHealthcareFeaturesTables;

