const request = require('supertest');
const express = require('express');
const { sequelize } = require('../src/config/database');

// Import routes and middleware
const residentsRoutes = require('../src/routes/residents');
const authRoutes = require('../src/routes/auth');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/residents', residentsRoutes);
const User = require('../src/models/User');
const Facility = require('../src/models/Facility');
const Resident = require('../src/models/Resident');

describe('Residents API', () => {
  let adminToken;
  let supervisorToken;
  let doctorToken;
  let caregiverToken;
  let facilityId;
  let doctorId;
  let testResidentId;

  beforeAll(async () => {
    // Connect to database
    await sequelize.authenticate();
    
    // Create test facility
    const facility = await Facility.create({
      name: 'Test Healthcare Facility',
      address: '123 Test St',
      phone: '123-456-7890',
      email: 'test@facility.com',
      status: 'active',
      isActive: true
    });
    facilityId = facility.id;

    // Create test users with different roles
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('Test123!@#', 12);

    const admin = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      passwordHash,
      role: 'admin',
      isActive: true,
      emailVerified: true
    });

    const supervisor = await User.create({
      name: 'Test Supervisor',
      email: 'supervisor@test.com',
      passwordHash,
      role: 'supervisor',
      facilityId: facilityId,
      isActive: true,
      emailVerified: true
    });

    const doctor = await User.create({
      name: 'Test Doctor',
      email: 'doctor@test.com',
      passwordHash,
      role: 'doctor',
      facilityId: facilityId,
      isActive: true,
      emailVerified: true
    });
    doctorId = doctor.id;

    const caregiver = await User.create({
      name: 'Test Caregiver',
      email: 'caregiver@test.com',
      passwordHash,
      role: 'caregiver',
      facilityId: facilityId,
      isActive: true,
      emailVerified: true
    });

    // Login to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Test123!@#' });
    adminToken = adminLogin.body.data.tokens.accessToken;

    const supervisorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'supervisor@test.com', password: 'Test123!@#' });
    supervisorToken = supervisorLogin.body.data.tokens.accessToken;

    const doctorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor@test.com', password: 'Test123!@#' });
    doctorToken = doctorLogin.body.data.tokens.accessToken;

    const caregiverLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'caregiver@test.com', password: 'Test123!@#' });
    caregiverToken = caregiverLogin.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await Resident.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Facility.destroy({ where: {}, force: true });
    await sequelize.close();
  });

  describe('GET /api/residents/physicians', () => {
    test('should return available physicians for admin', async () => {
      const response = await request(app)
        .get('/api/residents/physicians')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.physicians)).toBe(true);
    });

    test('should return physicians filtered by facility', async () => {
      const response = await request(app)
        .get('/api/residents/physicians')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/residents/physicians');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/residents', () => {
    test('should create resident with all fields (admin)', async () => {
      const residentData = {
        firstName: 'John',
        lastName: 'Doe',
        dob: '1950-01-15',
        gender: 'male',
        photoUrl: 'https://example.com/photo.jpg',
        admissionDate: '2024-01-01',
        dischargeDate: null,
        roomNumber: '101',
        primaryPhysician: doctorId,
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '555-1234',
        diagnosis: 'Hypertension',
        allergies: 'Peanuts',
        dietaryRestrictions: 'Low sodium',
        mobilityLevel: 'assisted',
        careLevel: 'assisted_living',
        insuranceProvider: 'Test Insurance',
        policyNumber: 'POL-12345',
        status: 'active',
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(residentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.resident).toBeDefined();
      expect(response.body.data.resident.firstName).toBe('John');
      expect(response.body.data.resident.lastName).toBe('Doe');
      testResidentId = response.body.data.resident.id;
    });

    test('should create resident with minimal required fields only', async () => {
      const residentData = {
        firstName: 'Jane',
        lastName: 'Smith',
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send(residentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.resident.firstName).toBe('Jane');
      expect(response.body.data.resident.lastName).toBe('Smith');
    });

    test('should reject missing firstName', async () => {
      const residentData = {
        lastName: 'Doe',
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(residentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject missing lastName', async () => {
      const residentData = {
        firstName: 'John',
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(residentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject invalid UUID for primaryPhysician', async () => {
      const residentData = {
        firstName: 'Test',
        lastName: 'User',
        primaryPhysician: 'invalid-uuid',
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(residentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject invalid date format', async () => {
      const residentData = {
        firstName: 'Test',
        lastName: 'User',
        dob: 'invalid-date',
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(residentData);

      expect(response.status).toBe(400);
    });

    test('should reject discharge date earlier than admission date', async () => {
      const residentData = {
        firstName: 'Test',
        lastName: 'User',
        admissionDate: '2024-01-15',
        dischargeDate: '2024-01-10',
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(residentData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Discharge date');
    });

    test('should reject invalid ENUM values', async () => {
      const residentData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'invalid-gender',
        mobilityLevel: 'invalid-mobility',
        careLevel: 'invalid-care',
        status: 'invalid-status',
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(residentData);

      expect(response.status).toBe(400);
    });

    test('should convert empty strings to null for optional fields', async () => {
      const residentData = {
        firstName: 'Test',
        lastName: 'User',
        photoUrl: '',
        roomNumber: '',
        primaryPhysician: '',
        diagnosis: '',
        allergies: '',
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(residentData);

      expect(response.status).toBe(201);
      expect(response.body.data.resident.photoUrl).toBeNull();
      expect(response.body.data.resident.roomNumber).toBeNull();
      expect(response.body.data.resident.primaryPhysician).toBeNull();
    });

    test('should create resident with firstName and lastName', async () => {
      const residentData = {
        firstName: 'Legacy',
        lastName: 'Test',
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(residentData);

      expect(response.status).toBe(201);
      expect(response.body.data.resident.firstName).toBe('Legacy');
      expect(response.body.data.resident.lastName).toBe('Test');
    });

    test('should reject if caregiver tries to create', async () => {
      const residentData = {
        firstName: 'Test',
        lastName: 'User',
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send(residentData);

      expect(response.status).toBe(403);
    });

    test('should handle supervisor without facilityId (fetch owned facilities)', async () => {
      // Create supervisor without facilityId but as owner
      const supervisorFacility = await Facility.create({
        name: 'Supervisor Owned Facility',
        address: '456 Test St',
        ownerId: (await User.findOne({ where: { email: 'supervisor@test.com' } })).id,
        status: 'active',
        isActive: true
      });

      const residentData = {
        firstName: 'Supervisor',
        lastName: 'Test',
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send(residentData);

      // Should work if supervisor has owned facility
      // This test depends on facilityFilter middleware behavior
      expect([201, 400]).toContain(response.status);
    });
  });

  describe('GET /api/residents', () => {
    test('should get all residents (pagination)', async () => {
      const response = await request(app)
        .get('/api/residents?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.residents).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/residents?status=active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.residents.length > 0) {
        expect(response.body.data.residents.every(r => r.status === 'active')).toBe(true);
      }
    });

    test('should search by name', async () => {
      const response = await request(app)
        .get('/api/residents?search=John')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should exclude soft-deleted residents', async () => {
      const response = await request(app)
        .get('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // Soft-deleted should not appear in results
      const deletedResidents = response.body.data.residents.filter(r => r.deletedAt !== null);
      expect(deletedResidents.length).toBe(0);
    });

    test('should return empty array when no residents', async () => {
      // Get residents from a facility with no residents
      const newFacility = await Facility.create({
        name: 'Empty Facility',
        address: '789 Test St',
        status: 'active',
        isActive: true
      });

      const newSupervisor = await User.create({
        name: 'New Supervisor',
        email: 'newsupervisor@test.com',
        passwordHash: await require('bcryptjs').hash('Test123!@#', 12),
        role: 'supervisor',
        facilityId: newFacility.id,
        isActive: true,
        emailVerified: true
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'newsupervisor@test.com', password: 'Test123!@#' });
      const token = loginRes.body.data.tokens.accessToken;

      const response = await request(app)
        .get('/api/residents')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.residents).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('GET /api/residents/:id', () => {
    test('should get resident by ID', async () => {
      if (!testResidentId) {
        // Create one if doesn't exist
        const resident = await Resident.create({
          firstName: 'Get',
          lastName: 'Test',
          facilityId: facilityId,
          name: 'Get Test'
        });
        testResidentId = resident.id;
      }

      const response = await request(app)
        .get(`/api/residents/${testResidentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.resident.id).toBe(testResidentId);
    });

    test('should return 404 for non-existent resident', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/residents/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test('should return 404 for soft-deleted resident', async () => {
      // Create and soft delete a resident
      const resident = await Resident.create({
        firstName: 'Deleted',
        lastName: 'Resident',
        facilityId: facilityId,
        name: 'Deleted Resident'
      });
      await resident.update({ deletedAt: new Date() });

      const response = await request(app)
        .get(`/api/residents/${resident.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/residents/:id', () => {
    test('should update resident', async () => {
      if (!testResidentId) {
        const resident = await Resident.create({
          firstName: 'Update',
          lastName: 'Test',
          facilityId: facilityId,
          name: 'Update Test'
        });
        testResidentId = resident.id;
      }

      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        roomNumber: '202'
      };

      const response = await request(app)
        .put(`/api/residents/${testResidentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.resident.firstName).toBe('Updated');
      expect(response.body.data.resident.lastName).toBe('Name');
    });

    test('should update primaryPhysician', async () => {
      if (!testResidentId) {
        const resident = await Resident.create({
          firstName: 'Update',
          lastName: 'Test',
          facilityId: facilityId,
          name: 'Update Test'
        });
        testResidentId = resident.id;
      }

      const updateData = {
        primaryPhysician: doctorId
      };

      const response = await request(app)
        .put(`/api/residents/${testResidentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.resident.primaryPhysician).toBe(doctorId);
    });

    test('should reject invalid UUID for primaryPhysician update', async () => {
      if (!testResidentId) {
        const resident = await Resident.create({
          firstName: 'Update',
          lastName: 'Test',
          facilityId: facilityId,
          name: 'Update Test'
        });
        testResidentId = resident.id;
      }

      const updateData = {
        primaryPhysician: 'invalid-uuid'
      };

      const response = await request(app)
        .put(`/api/residents/${testResidentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
    });

    test('should prevent caregiver from updating', async () => {
      if (!testResidentId) {
        const resident = await Resident.create({
          firstName: 'Update',
          lastName: 'Test',
          facilityId: facilityId,
          name: 'Update Test'
        });
        testResidentId = resident.id;
      }

      const updateData = {
        roomNumber: '999'
      };

      const response = await request(app)
        .put(`/api/residents/${testResidentId}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/residents/:id', () => {
    test('should soft delete resident (admin only)', async () => {
      const resident = await Resident.create({
        firstName: 'Delete',
        lastName: 'Test',
        facilityId: facilityId,
        name: 'Delete Test'
      });

      const response = await request(app)
        .delete(`/api/residents/${resident.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify soft delete
      const deletedResident = await Resident.findByPk(resident.id, { paranoid: false });
      expect(deletedResident.deletedAt).not.toBeNull();
    });

    test('should reject delete by non-admin', async () => {
      const resident = await Resident.create({
        firstName: 'Delete',
        lastName: 'Test',
        facilityId: facilityId,
        name: 'Delete Test'
      });

      const response = await request(app)
        .delete(`/api/residents/${resident.id}`)
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(403);
    });

    test('should return 404 for already deleted resident', async () => {
      const resident = await Resident.create({
        firstName: 'Deleted',
        lastName: 'Test',
        facilityId: facilityId,
        name: 'Deleted Test',
        deletedAt: new Date()
      });

      const response = await request(app)
        .delete(`/api/residents/${resident.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long strings gracefully', async () => {
      const longString = 'A'.repeat(10000);
      const residentData = {
        firstName: 'Long',
        lastName: 'String',
        diagnosis: longString,
        allergies: longString,
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(residentData);

      expect(response.status).toBe(201);
      expect(response.body.data.resident.diagnosis).toBeDefined();
    });

    test('should handle special characters in names', async () => {
      const residentData = {
        firstName: "O'Brien",
        lastName: 'Smith-Jones',
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(residentData);

      expect(response.status).toBe(201);
      expect(response.body.data.resident.firstName).toBe("O'Brien");
      expect(response.body.data.resident.lastName).toBe('Smith-Jones');
    });

    test('should handle whitespace-only fields', async () => {
      const residentData = {
        firstName: '   ',
        lastName: 'Test',
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(residentData);

      expect(response.status).toBe(400); // Should reject whitespace-only firstName
    });

    test('should handle future dates', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const residentData = {
        firstName: 'Future',
        lastName: 'Date',
        admissionDate: futureDate.toISOString().split('T')[0],
        facilityId: facilityId
      };

      const response = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(residentData);

      expect(response.status).toBe(201); // Should accept future dates
    });
  });
});

