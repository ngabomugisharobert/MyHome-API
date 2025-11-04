const fs = require('fs');
const path = require('path');

// ⚠️  IMPORTANT: This is a template file
// Copy this file to setup-actual-cloud-db.js and fill in your actual credentials
// DO NOT commit setup-actual-cloud-db.js to version control

// Your actual Aiven cloud PostgreSQL configuration
// Replace the placeholder values below with your real credentials
const actualCloudConfig = {
  DB_HOST: 'your-aiven-database-host.aivencloud.com',
  DB_PORT: 'your-port',
  DB_NAME: 'your-database-name',
  DB_USER: 'your-database-user',
  DB_PASSWORD: 'your-database-password',
  DB_URL: 'postgres://your-database-user:your-database-password@your-aiven-database-host.aivencloud.com:your-port/your-database-name?sslmode=require'
};

// Generate .env file content
const envContent = `# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration - Aiven Cloud PostgreSQL
DB_HOST=${actualCloudConfig.DB_HOST}
DB_PORT=${actualCloudConfig.DB_PORT}
DB_NAME=${actualCloudConfig.DB_NAME}
DB_USER=${actualCloudConfig.DB_USER}
DB_PASSWORD=${actualCloudConfig.DB_PASSWORD}
DB_URL=${actualCloudConfig.DB_URL}

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;

// Write .env file
fs.writeFileSync('.env', envContent);

console.log('✅ .env file created with actual cloud PostgreSQL configuration');
console.log('📋 Database Details:');
console.log(`   Host: ${actualCloudConfig.DB_HOST}`);
console.log(`   Port: ${actualCloudConfig.DB_PORT}`);
console.log(`   Database: ${actualCloudConfig.DB_NAME}`);
console.log(`   User: ${actualCloudConfig.DB_USER}`);
console.log('');
console.log('🚀 Next steps:');
console.log('1. Run: npm install');
console.log('2. Run: npm run migrate up');
console.log('3. Run: npm run seed seed');
console.log('4. Run: npm run dev');
console.log('');
console.log('⚠️  SECURITY NOTE:');
console.log('- This file contains real database credentials');
console.log('- Make sure setup-actual-cloud-db.js is in .gitignore');
console.log('- Never commit setup-actual-cloud-db.js to version control');

