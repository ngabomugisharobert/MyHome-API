const { sequelize } = require('../../config/database');

async function createResidentFeaturesTables() {
  try {
    console.log('🏥 Creating resident features tables (notes, assessments, reports, forms)...');

    // Create ENUM types
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE note_category AS ENUM ('general', 'medical', 'behavioral', 'social', 'incident', 'medication', 'nutrition', 'activity', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE assessment_type AS ENUM ('initial', 'quarterly', 'annual', 'change_in_condition', 'discharge', 'fall', 'medication_review', 'nutrition', 'cognitive', 'functional', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE report_type AS ENUM ('monthly', 'quarterly', 'annual', 'incident', 'medication', 'care_plan_review', 'discharge', 'custom', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE form_type AS ENUM ('admission', 'consent', 'authorization', 'incident', 'medication', 'care_plan', 'discharge', 'custom', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create resident_notes table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS resident_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        content TEXT NOT NULL,
        category note_category NOT NULL DEFAULT 'general',
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        is_private BOOLEAN NOT NULL DEFAULT false,
        tags JSONB DEFAULT '[]',
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create resident_assessments table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS resident_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assessment_type assessment_type NOT NULL,
        assessment_date TIMESTAMP WITH TIME ZONE NOT NULL,
        next_assessment_date TIMESTAMP WITH TIME ZONE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        findings JSONB DEFAULT '{}',
        recommendations TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        score INTEGER,
        max_score INTEGER,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create resident_reports table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS resident_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report_type report_type NOT NULL,
        report_date TIMESTAMP WITH TIME ZONE NOT NULL,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        content JSONB DEFAULT '{}',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_date TIMESTAMP WITH TIME ZONE,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create resident_forms table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS resident_forms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        form_type form_type NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        form_data JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        signed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        signed_date TIMESTAMP WITH TIME ZONE,
        witness_by UUID REFERENCES users(id) ON DELETE SET NULL,
        expiry_date TIMESTAMP WITH TIME ZONE,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_resident_notes_resident ON resident_notes(resident_id);
      CREATE INDEX IF NOT EXISTS idx_resident_notes_created_by ON resident_notes(created_by);
      CREATE INDEX IF NOT EXISTS idx_resident_notes_category ON resident_notes(category);
      CREATE INDEX IF NOT EXISTS idx_resident_notes_created_at ON resident_notes(created_at DESC);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_resident_assessments_resident ON resident_assessments(resident_id);
      CREATE INDEX IF NOT EXISTS idx_resident_assessments_type ON resident_assessments(assessment_type);
      CREATE INDEX IF NOT EXISTS idx_resident_assessments_date ON resident_assessments(assessment_date DESC);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_resident_reports_resident ON resident_reports(resident_id);
      CREATE INDEX IF NOT EXISTS idx_resident_reports_type ON resident_reports(report_type);
      CREATE INDEX IF NOT EXISTS idx_resident_reports_date ON resident_reports(report_date DESC);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_resident_forms_resident ON resident_forms(resident_id);
      CREATE INDEX IF NOT EXISTS idx_resident_forms_type ON resident_forms(form_type);
      CREATE INDEX IF NOT EXISTS idx_resident_forms_status ON resident_forms(status);
    `);

    console.log('✅ Resident features tables created successfully!');
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating resident features tables:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  createResidentFeaturesTables()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createResidentFeaturesTables;


