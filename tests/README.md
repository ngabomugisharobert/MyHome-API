# Backend Test Suite

This directory contains comprehensive tests for the MyHome Healthcare API backend.

## 📁 Test Structure

```
tests/
├── controllers/          # Controller tests
│   ├── auth.test.js      # Authentication controller tests
│   ├── user.test.js      # User controller tests
│   └── facility.test.js  # Facility controller tests
├── middleware/           # Middleware tests
│   ├── auth.test.js      # Authentication middleware tests
│   └── facilityFilter.test.js # Facility filtering tests
├── integration/          # Integration tests
│   └── api.test.js       # End-to-end API tests
├── setup/               # Test setup and utilities
│   └── testSetup.js      # Database setup and helpers
├── config/              # Test configuration
│   └── testConfig.js     # Test environment config
└── runTests.js          # Test runner script
```

## 🧪 Test Categories

### 1. **Authentication Controller Tests** (`tests/controllers/auth.test.js`)
- ✅ User login with valid/invalid credentials
- ✅ User registration with validation
- ✅ Token refresh functionality
- ✅ Logout functionality
- ✅ Password hashing verification
- ✅ Account lockout scenarios

### 2. **User Controller Tests** (`tests/controllers/user.test.js`)
- ✅ CRUD operations for users
- ✅ Role-based access control
- ✅ Data filtering and pagination
- ✅ Search functionality
- ✅ Password hash exclusion
- ✅ Facility filtering for facility owners

### 3. **Facility Controller Tests** (`tests/controllers/facility.test.js`)
- ✅ CRUD operations for facilities
- ✅ Admin-only access control
- ✅ Data validation
- ✅ Search and pagination
- ✅ Facility filtering

### 4. **Middleware Tests** (`tests/middleware/`)
- ✅ Authentication middleware
- ✅ Authorization middleware
- ✅ Facility filtering middleware
- ✅ Error handling
- ✅ Token validation

### 5. **Integration Tests** (`tests/integration/api.test.js`)
- ✅ Complete user workflows
- ✅ Complete facility workflows
- ✅ RBAC enforcement
- ✅ Token management
- ✅ Data validation
- ✅ Pagination

## 🚀 Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Authentication tests
npm run test:auth

# User management tests
npm run test:users

# Facility management tests
npm run test:facilities

# Middleware tests
npm run test:middleware

# Integration tests
npm run test:integration
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

## 📊 Test Coverage

The test suite covers:

- **Authentication**: 100% of auth controller functions
- **User Management**: 100% of user CRUD operations
- **Facility Management**: 100% of facility CRUD operations
- **Middleware**: 100% of middleware functions
- **RBAC**: Complete role-based access control testing
- **Data Validation**: Input validation and error handling
- **Integration**: End-to-end workflow testing

## 🔧 Test Configuration

### Database Setup
- Tests use a separate test database (`myhome_test_db`)
- Database is reset before each test run
- Test data is created and cleaned up automatically

### Environment Variables
- `NODE_ENV=test`
- Test-specific JWT secrets
- Isolated database connections

### Test Data
- Pre-configured test users with different roles
- Test facilities and relationships
- Mock data for edge cases

## 📝 Test Scenarios

### Authentication Scenarios
1. **Valid Login**: User with correct credentials
2. **Invalid Login**: User with wrong password
3. **Non-existent User**: Login with unregistered email
4. **Inactive User**: Login with deactivated account
5. **Token Refresh**: Valid/invalid refresh tokens
6. **Registration**: Valid/invalid user registration

### RBAC Scenarios
1. **Admin Access**: Full system access
2. **Supervisor Access**: Limited admin functions
3. **Caregiver Access**: Restricted to own data
4. **Facility Owner**: Facility-specific data only
5. **Unauthorized Access**: Proper rejection of invalid roles

### Data Validation Scenarios
1. **Required Fields**: Missing required data
2. **Invalid Formats**: Invalid email, phone, etc.
3. **Duplicate Data**: Duplicate emails, etc.
4. **Data Types**: Invalid data types
5. **Length Limits**: Field length validation

### Integration Scenarios
1. **Complete Workflows**: End-to-end user/facility management
2. **Token Management**: Login → API calls → Refresh → Logout
3. **Error Handling**: Graceful error responses
4. **Pagination**: Large dataset handling
5. **Search**: Text search functionality

## 🛠 Test Utilities

### `testSetup.js`
- Database connection and cleanup
- Test data creation
- Authentication token generation
- Helper functions for common test operations

### `testConfig.js`
- Test environment configuration
- Database settings
- Security settings
- CORS and rate limiting

## 📈 Performance Testing

The test suite includes performance considerations:
- Database query optimization
- Memory usage monitoring
- Response time validation
- Concurrent request handling

## 🔒 Security Testing

Security tests cover:
- Authentication bypass attempts
- Authorization escalation
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting enforcement

## 📋 Test Checklist

Before running tests, ensure:
- [ ] PostgreSQL is running
- [ ] Test database exists
- [ ] Environment variables are set
- [ ] Dependencies are installed
- [ ] No conflicting processes on test ports

## 🐛 Debugging Tests

### Common Issues
1. **Database Connection**: Check PostgreSQL is running
2. **Port Conflicts**: Ensure test ports are available
3. **Environment Variables**: Verify test configuration
4. **Dependencies**: Run `npm install` if tests fail to start

### Debug Mode
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test with debug info
npm test -- --testNamePattern="should login with valid credentials"
```

## 📊 Coverage Reports

Coverage reports are generated in the `coverage/` directory:
- HTML report: `coverage/lcov-report/index.html`
- LCOV report: `coverage/lcov.info`
- Text summary in console output

## 🔄 Continuous Integration

The test suite is designed for CI/CD:
- Automated test execution
- Coverage reporting
- Test result aggregation
- Failure notification
- Performance monitoring

## 📚 Best Practices

1. **Test Isolation**: Each test is independent
2. **Data Cleanup**: Tests clean up after themselves
3. **Mocking**: External dependencies are mocked
4. **Assertions**: Comprehensive assertion coverage
5. **Error Cases**: Both success and failure scenarios
6. **Performance**: Tests complete within reasonable time
7. **Maintainability**: Clear test structure and naming
