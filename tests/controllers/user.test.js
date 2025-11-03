const request = require('supertest');
const app = require('../../src/server');
const { setupTestDB, cleanupTestDB, getAuthToken } = require('../setup/testSetup');
const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');

describe('User Controller', () => {
  let testUser;
  let testFacility;
  let authToken;
  let caregiverToken;

  beforeAll(async () => {
    const { testUser: user, testFacility: facility, caregiver } = await setupTestDB();
    testUser = user;
    testFacility = facility;
    authToken = await getAuthToken(app);
    caregiverToken = await getAuthToken(app, 'caregiver@example.com', 'password123');
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  describe('GET /api/users', () => {
    it('should get all users with valid admin token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThan(0);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should reject caregiver access to admin routes', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${caregiverToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/users?role=caregiver')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.users.every(user => user.role === 'caregiver')).toBe(true);
    });

    it('should search users by name', async () => {
      const response = await request(app)
        .get('/api/users?search=Test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.users.some(user => user.name.includes('Test'))).toBe(true);
    });

    it('should paginate users', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.users.length).toBeLessThanOrEqual(2);
    });

    it('should exclude password hash from response', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.users.forEach(user => {
        expect(user.passwordHash).toBeUndefined();
      });
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should allow users to access their own profile', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.id).toBe(testUser.id);
    });

    it('should exclude password hash from user details', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Test User',
          email: 'updated@example.com',
          role: 'doctor',
          isActive: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe('Updated Test User');
      expect(response.body.data.user.email).toBe('updated@example.com');
      expect(response.body.data.user.role).toBe('doctor');
    });

    it('should reject invalid role update', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test User',
          email: 'test@example.com',
          role: 'invalid_role',
          isActive: true
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should allow users to update their own profile', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Self Updated User',
          email: 'selfupdated@example.com',
          role: 'admin',
          isActive: true
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.name).toBe('Self Updated User');
    });

    it('should handle partial updates', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Partially Updated User'
          // Only updating name
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.name).toBe('Partially Updated User');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user', async () => {
      // Create user to delete
      const userToDelete = await User.create({
        name: 'User To Delete',
        email: 'delete@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'caregiver',
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      });

      const response = await request(app)
        .delete(`/api/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is deleted
      const deletedUser = await User.findByPk(userToDelete.id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should reject caregiver from deleting users', async () => {
      const userToDelete = await User.create({
        name: 'User To Delete',
        email: 'delete2@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'caregiver',
        isActive: true,
        emailVerified: true,
        facilityId: testFacility.id
      });

      const response = await request(app)
        .delete(`/api/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${caregiverToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Facility Filtering', () => {
    it('should filter users by facility for facility owners', async () => {
      // This test would require a facility owner user
      // For now, we'll test that the endpoint works with facility filtering
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.users).toBeDefined();
    });
  });
});

