#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Starting Backend Test Suite...\n');

// Set test environment
process.env.NODE_ENV = 'test';

try {
  // Run all tests
  console.log('📋 Running all tests...');
  execSync('npm test', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ All tests completed successfully!');
} catch (error) {
  console.error('\n❌ Tests failed:', error.message);
  process.exit(1);
}
