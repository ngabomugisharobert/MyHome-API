module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/testSetup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/database/**',
    '!src/server.js',
    '!src/config/database.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,
  // Prevent server from starting during tests
  setupFiles: ['<rootDir>/tests/setup/jestSetup.js'],
  // Only run unit tests by default
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/tests/controllers/',
    '/tests/integration/'
  ]
};
