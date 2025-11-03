require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 3005,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'myhome_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    url: process.env.DB_URL
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // limit each IP to 100 requests per windowMs
  },
  
  // User roles for healthcare system
  roles: {
    ADMIN: 'admin',
    CAREGIVER: 'caregiver',
    DOCTOR: 'doctor',
    SUPERVISOR: 'supervisor'
  },
  
  // Role permissions
  permissions: {
    admin: ['all'],
    supervisor: ['view_reports', 'view_audit_logs', 'view_users'],
    doctor: ['prescribe_medications', 'view_residents', 'update_medical_records'],
    caregiver: ['view_assigned_residents', 'update_daily_logs', 'mark_medication_admin']
  },
  
  // Security settings
  security: {
    maxFailedAttempts: 5,
    lockoutDuration: 30, // minutes
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    passwordRequireNumber: true,
    jwtExpirationHours: 1,
    refreshTokenExpirationDays: 7
  }
};

module.exports = config;
