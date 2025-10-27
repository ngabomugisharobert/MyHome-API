#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Running Unit Tests...\n');

// Set test environment
process.env.NODE_ENV = 'test';

try {
  // Run only unit tests
  console.log('📋 Running unit tests...');
  execSync('npm test -- tests/unit/', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '../..')
  });
  
  console.log('\n✅ Unit tests completed successfully!');
} catch (error) {
  console.error('\n❌ Unit tests failed:', error.message);
  process.exit(1);
}
