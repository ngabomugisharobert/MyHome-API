// Test Configuration
module.exports = {
  // Test Environment
  NODE_ENV: 'test',
  PORT: 3006,

  // Database Configuration for Testing
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'myhome_test_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_only',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Security Configuration
  security: {
    bcryptRounds: 12,
    maxFailedAttempts: 5,
    lockoutDuration: 30
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 900000, // 15 minutes
    maxRequests: 100
  }
};
