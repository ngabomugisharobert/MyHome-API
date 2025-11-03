const request = require('supertest');
const app = require('../../src/server');
const { setupTestDB, cleanupTestDB, getAuthToken } = require('../setup/testSetup');
const User = require('../../src/models/User');
const Facility = require('../../src/models/Facility');

describe('API Integration Tests', () => {
  let testUser;
  let testFacility;
  let authToken;

  beforeAll(async () => {
    const { testUser: user, testFacility: facility } = await setupTestDB();
    testUser = user;
    testFacility = facility;
    authToken = await getAuthToken(app);
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  describe('Complete User Workflow', () => {
    it('should complete full user lifecycle', async () => {
      // 1. Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Integration Test User',
          email: 'integration@example.com',
          password: 'password123',
          role: 'caregiver'
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      const newUserId = registerResponse.body.data.user.id;

      // 2. Login with new user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@example.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      const userToken = loginResponse.body.data.tokens.accessToken;

      // 3. Get user profile (should fail for caregiver)
      const profileResponse = await request(app)
        .get(`/api/users/${newUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(profileResponse.status).toBe(403); // Caregiver can't access user routes

      // 4. Update user (admin only)
      const updateResponse = await request(app)
        .put(`/api/users/${newUserId}`)
        .set('Authorization', `Bearer ${authToken}`) // Admin token
        .send({
          name: 'Updated Integration User',
          role: 'doctor'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.user.name).toBe('Updated Integration User');
      expect(updateResponse.body.data.user.role).toBe('doctor');

      // 5. Delete user (admin only)
      const deleteResponse = await request(app)
        .delete(`/api/users/${newUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // 6. Verify user is deleted
      const deletedUser = await User.findByPk(newUserId);
      expect(deletedUser).toBeNull();
    });
  });

  describe('Complete Facility Workflow', () => {
    it('should complete full facility lifecycle', async () => {
      // 1. Create new facility
      const createResponse = await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Integration Test Facility',
          address: '123 Integration St, Test City, TC 12345',
          phone: '555-0123',
          email: 'integration@facility.com',
          licenseNumber: 'INT-LIC-001',
          isActive: true
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      const facilityId = createResponse.body.data.facility.id;

      // 2. Get facility by ID
      const getResponse = await request(app)
        .get(`/api/facilities/${facilityId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.facility.name).toBe('Integration Test Facility');

      // 3. Update facility
      const updateResponse = await request(app)
        .put(`/api/facilities/${facilityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Integration Facility',
          address: '456 Updated St, Updated City, UC 54321',
          phone: '555-0456',
          email: 'updated@facility.com',
          licenseNumber: 'UPD-LIC-001',
          isActive: true
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.facility.name).toBe('Updated Integration Facility');

      // 4. Search facilities
      const searchResponse = await request(app)
        .get('/api/facilities?search=Integration')
        .set('Authorization', `Bearer ${authToken}`);

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.facilities.some(f => f.name.includes('Integration'))).toBe(true);

      // 5. Delete facility
      const deleteResponse = await request(app)
        .delete(`/api/facilities/${facilityId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // 6. Verify facility is deleted
      const deletedFacility = await Facility.findByPk(facilityId);
      expect(deletedFacility).toBeNull();
    });
  });

  describe('RBAC Integration', () => {
    it('should enforce role-based access control', async () => {
      // Create caregiver user
      const caregiverResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Caregiver',
          email: 'rbac@example.com',
          password: 'password123',
          role: 'caregiver'
        });

      expect(caregiverResponse.status).toBe(201);
      const caregiverToken = caregiverResponse.body.data.tokens.accessToken;

      // Caregiver should not access admin routes
      const adminRouteResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${caregiverToken}`);

      expect(adminRouteResponse.status).toBe(403);
      expect(adminRouteResponse.body.success).toBe(false);

      // Caregiver should not access facility routes
      const facilityRouteResponse = await request(app)
        .get('/api/facilities')
        .set('Authorization', `Bearer ${caregiverToken}`);

      expect(facilityRouteResponse.status).toBe(403);
      expect(facilityRouteResponse.body.success).toBe(false);

      // Clean up
      await User.destroy({ where: { email: 'rbac@example.com' } });
    });

    it('should allow supervisor access to appropriate routes', async () => {
      // Create supervisor user
      const supervisorResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Supervisor',
          email: 'supervisor@example.com',
          password: 'password123',
          role: 'supervisor'
        });

      expect(supervisorResponse.status).toBe(201);
      const supervisorToken = supervisorResponse.body.data.tokens.accessToken;

      // Supervisor should access user routes
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(usersResponse.status).toBe(200);
      expect(usersResponse.body.success).toBe(true);

      // Supervisor should access facility routes
      const facilitiesResponse = await request(app)
        .get('/api/facilities')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(facilitiesResponse.status).toBe(200);
      expect(facilitiesResponse.body.success).toBe(true);

      // Clean up
      await User.destroy({ where: { email: 'supervisor@example.com' } });
    });
  });

  describe('Token Management Integration', () => {
    it('should handle token refresh workflow', async () => {
      // 1. Login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const { accessToken, refreshToken } = loginResponse.body.data.tokens;

      // 2. Use access token for API call
      const apiResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(apiResponse.status).toBe(200);

      // 3. Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data.tokens.accessToken).toBeDefined();

      // 4. Use new access token
      const newApiResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${refreshResponse.body.data.tokens.accessToken}`);

      expect(newApiResponse.status).toBe(200);
    });

    it('should handle invalid token scenarios', async () => {
      // Invalid access token
      const invalidTokenResponse = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid_token');

      expect(invalidTokenResponse.status).toBe(403);

      // Expired token (simulated)
      const expiredTokenResponse = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer expired_token');

      expect(expiredTokenResponse.status).toBe(403);

      // Missing token
      const missingTokenResponse = await request(app)
        .get('/api/users');

      expect(missingTokenResponse.status).toBe(401);
    });
  });

  describe('Data Validation Integration', () => {
    it('should validate user registration data', async () => {
      // Test missing required fields
      const missingFieldsResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Incomplete User'
          // Missing email, password, role
        });

      expect(missingFieldsResponse.status).toBe(400);

      // Test invalid email format
      const invalidEmailResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Email User',
          email: 'invalid-email',
          password: 'password123',
          role: 'caregiver'
        });

      expect(invalidEmailResponse.status).toBe(400);

      // Test invalid role
      const invalidRoleResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Role User',
          email: 'invalidrole@example.com',
          password: 'password123',
          role: 'invalid_role'
        });

      expect(invalidRoleResponse.status).toBe(400);
    });

    it('should validate facility creation data', async () => {
      // Test missing required fields
      const missingFieldsResponse = await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          address: '123 Test St'
          // Missing name
        });

      expect(missingFieldsResponse.status).toBe(400);

      // Test invalid email format
      const invalidEmailResponse = await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Email Facility',
          address: '123 Test St',
          email: 'invalid-email-format'
        });

      expect(invalidEmailResponse.status).toBe(400);
    });
  });

  describe('Pagination Integration', () => {
    it('should handle pagination for users', async () => {
      // Create multiple users for pagination testing
      const users = [];
      for (let i = 0; i < 5; i++) {
        const user = await User.create({
          name: `Pagination User ${i}`,
          email: `pagination${i}@example.com`,
          passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2a',
          role: 'caregiver',
          isActive: true,
          emailVerified: true,
          facilityId: testFacility.id
        });
        users.push(user);
      }

      // Test pagination
      const page1Response = await request(app)
        .get('/api/users?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.data.page).toBe(1);
      expect(page1Response.body.data.users.length).toBeLessThanOrEqual(2);

      // Test second page
      const page2Response = await request(app)
        .get('/api/users?page=2&limit=2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(page2Response.status).toBe(200);
      expect(page2Response.body.data.page).toBe(2);

      // Clean up
      await User.destroy({ where: { email: { $like: 'pagination%@example.com' } } });
    });
  });
});



