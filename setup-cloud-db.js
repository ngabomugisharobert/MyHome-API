const fs = require('fs');
const path = require('path');

// Cloud PostgreSQL configuration - Replace with your actual values
const cloudConfig = {
  DB_HOST: 'your-database-host.com',
  DB_PORT: '5432',
  DB_NAME: 'your_database_name',
  DB_USER: 'your_database_user',
  DB_PASSWORD: 'your_database_password_here',
  DB_URL: 'postgresql://your_database_user:your_database_password_here@your-database-host.com:5432/your_database_name?sslmode=require'
};

// Generate .env file content
const envContent = `# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration - Aiven Cloud PostgreSQL
DB_HOST=${cloudConfig.DB_HOST}
DB_PORT=${cloudConfig.DB_PORT}
DB_NAME=${cloudConfig.DB_NAME}
DB_USER=${cloudConfig.DB_USER}
DB_PASSWORD=${cloudConfig.DB_PASSWORD}
DB_URL=${cloudConfig.DB_URL}

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

console.log('✅ .env file created with cloud PostgreSQL configuration');
console.log('📋 Database Details:');
console.log(`   Host: ${cloudConfig.DB_HOST}`);
console.log(`   Port: ${cloudConfig.DB_PORT}`);
console.log(`   Database: ${cloudConfig.DB_NAME}`);
console.log(`   User: ${cloudConfig.DB_USER}`);
console.log('');
console.log('🚀 Next steps:');
console.log('1. Run: npm install');
console.log('2. Run: npm run migrate up');
console.log('3. Run: npm run seed seed');
console.log('4. Run: npm run dev');
