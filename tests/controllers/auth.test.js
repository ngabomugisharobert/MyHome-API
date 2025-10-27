const request = require('supertest');
const app = require('../../src/server');
const { setupTestDB, cleanupTestDB, getAuthToken } = require('../setup/testSetup');
const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');

describe('Authentication Controller', () => {
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

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject inactive user', async () => {
      // Create inactive user
      await User.create({
        name: 'Inactive User',
        email: 'inactive@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'caregiver',
        isActive: false,
        emailVerified: true,
        facilityId: testFacility.id
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Account is deactivated');
    });

    it('should handle missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new user with valid data (admin only)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${authToken}`) // Admin token required
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
          role: 'caregiver'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.user.name).toBe('New User');
      expect(response.body.data.user.role).toBe('caregiver');
    });

    it('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${authToken}`) // Admin token required
        .send({
          name: 'Duplicate User',
          email: 'test@example.com', // Already exists
          password: 'password123',
          role: 'caregiver'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${authToken}`) // Admin token required
        .send({
          name: 'Invalid Role User',
          email: 'invalidrole@example.com',
          password: 'password123',
          role: 'invalid_role'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${authToken}`) // Admin token required
        .send({
          name: 'Incomplete User',
          email: 'incomplete@example.com'
          // Missing password and role
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should hash password correctly', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${authToken}`) // Admin token required
        .send({
          name: 'Password Test User',
          email: 'passwordtest@example.com',
          password: 'password123',
          role: 'caregiver'
        });

      expect(response.status).toBe(201);
      
      // Verify password is hashed in database
      const user = await User.findOne({ where: { email: 'passwordtest@example.com' } });
      expect(user.passwordHash).not.toBe('password123');
      expect(user.passwordHash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh valid token', async () => {
      // First login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const refreshToken = loginResponse.body.data.tokens.refreshToken;

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid_token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });
  });
});
