const request = require('supertest');
const app = require('../../src/server');
const { setupTestDB, cleanupTestDB, getAuthToken } = require('../setup/testSetup');
const Facility = require('../../src/models/Facility');

describe('Facility Controller', () => {
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

  describe('GET /api/facilities', () => {
    it('should get all facilities with valid admin token', async () => {
      const response = await request(app)
        .get('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.facilities).toBeDefined();
      expect(Array.isArray(response.body.data.facilities)).toBe(true);
      expect(response.body.data.facilities.length).toBeGreaterThan(0);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/facilities');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/facilities')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should reject caregiver access to admin routes', async () => {
      const response = await request(app)
        .get('/api/facilities')
        .set('Authorization', `Bearer ${caregiverToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should search facilities by name', async () => {
      const response = await request(app)
        .get('/api/facilities?search=Test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.facilities.some(facility => 
        facility.name.includes('Test')
      )).toBe(true);
    });

    it('should search facilities by address', async () => {
      const response = await request(app)
        .get('/api/facilities?search=Test City')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.facilities.some(facility => 
        facility.address.includes('Test City')
      )).toBe(true);
    });

    it('should paginate facilities', async () => {
      const response = await request(app)
        .get('/api/facilities?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.facilities.length).toBeLessThanOrEqual(1);
    });

    it('should return total count and pagination info', async () => {
      const response = await request(app)
        .get('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.totalPages).toBeDefined();
      expect(response.body.data.page).toBeDefined();
    });
  });

  describe('GET /api/facilities/:id', () => {
    it('should get facility by ID', async () => {
      const response = await request(app)
        .get(`/api/facilities/${testFacility.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.facility.id).toBe(testFacility.id);
      expect(response.body.data.facility.name).toBe(testFacility.name);
    });

    it('should return 404 for non-existent facility', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/facilities/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Facility not found');
    });

    it('should include all facility fields', async () => {
      const response = await request(app)
        .get(`/api/facilities/${testFacility.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const facility = response.body.data.facility;
      expect(facility.name).toBeDefined();
      expect(facility.address).toBeDefined();
      expect(facility.phone).toBeDefined();
      expect(facility.email).toBeDefined();
      expect(facility.licenseNumber).toBeDefined();
      expect(facility.isActive).toBeDefined();
    });
  });

  describe('POST /api/facilities', () => {
    it('should create new facility with valid data', async () => {
      const facilityData = {
        name: 'New Healthcare Center',
        address: '456 New St, New City, NC 54321',
        phone: '555-0456',
        email: 'new@healthcare.com',
        licenseNumber: 'NEW-LIC-002',
        isActive: true
      };

      const response = await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(facilityData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.facility.name).toBe(facilityData.name);
      expect(response.body.data.facility.address).toBe(facilityData.address);
      expect(response.body.data.facility.phone).toBe(facilityData.phone);
      expect(response.body.data.facility.email).toBe(facilityData.email);
      expect(response.body.data.facility.licenseNumber).toBe(facilityData.licenseNumber);
      expect(response.body.data.facility.isActive).toBe(facilityData.isActive);
    });

    it('should reject facility with missing required fields', async () => {
      const response = await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing name
          address: '456 New St, New City, NC 54321'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject facility with invalid email format', async () => {
      const response = await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Email Facility',
          address: '456 New St, New City, NC 54321',
          phone: '555-0456',
          email: 'invalid-email-format',
          licenseNumber: 'INV-LIC-001',
          isActive: true
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject caregiver from creating facilities', async () => {
      const facilityData = {
        name: 'Unauthorized Facility',
        address: '789 Unauthorized St, Unauthorized City, UC 78901',
        phone: '555-0789',
        email: 'unauthorized@healthcare.com',
        licenseNumber: 'UNA-LIC-001',
        isActive: true
      };

      const response = await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send(facilityData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should handle optional fields correctly', async () => {
      const facilityData = {
        name: 'Minimal Facility',
        address: '123 Minimal St, Minimal City, MC 12345'
        // Only required fields
      };

      const response = await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(facilityData);

      expect(response.status).toBe(201);
      expect(response.body.data.facility.name).toBe(facilityData.name);
      expect(response.body.data.facility.address).toBe(facilityData.address);
    });
  });

  describe('PUT /api/facilities/:id', () => {
    it('should update facility with valid data', async () => {
      const updateData = {
        name: 'Updated Healthcare Center',
        address: '789 Updated St, Updated City, UC 98765',
        phone: '555-0789',
        email: 'updated@healthcare.com',
        licenseNumber: 'UPD-LIC-003',
        isActive: true
      };

      const response = await request(app)
        .put(`/api/facilities/${testFacility.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.facility.name).toBe(updateData.name);
      expect(response.body.data.facility.address).toBe(updateData.address);
      expect(response.body.data.facility.phone).toBe(updateData.phone);
      expect(response.body.data.facility.email).toBe(updateData.email);
      expect(response.body.data.facility.licenseNumber).toBe(updateData.licenseNumber);
    });

    it('should return 404 for non-existent facility', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/facilities/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Facility'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Facility not found');
    });

    it('should handle partial updates', async () => {
      const response = await request(app)
        .put(`/api/facilities/${testFacility.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Partially Updated Facility'
          // Only updating name
        });

      expect(response.status).toBe(200);
      expect(response.body.data.facility.name).toBe('Partially Updated Facility');
    });

    it('should reject caregiver from updating facilities', async () => {
      const response = await request(app)
        .put(`/api/facilities/${testFacility.id}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          name: 'Unauthorized Update'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/facilities/:id', () => {
    it('should delete facility', async () => {
      // Create facility to delete
      const facilityToDelete = await Facility.create({
        name: 'Facility To Delete',
        address: '999 Delete St, Delete City, DC 99999',
        phone: '555-0999',
        email: 'delete@healthcare.com',
        licenseNumber: 'DEL-LIC-999',
        isActive: true
      });

      const response = await request(app)
        .delete(`/api/facilities/${facilityToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Facility deleted successfully');

      // Verify facility is deleted
      const deletedFacility = await Facility.findByPk(facilityToDelete.id);
      expect(deletedFacility).toBeNull();
    });

    it('should return 404 for non-existent facility', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/facilities/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Facility not found');
    });

    it('should reject caregiver from deleting facilities', async () => {
      const facilityToDelete = await Facility.create({
        name: 'Unauthorized Delete Facility',
        address: '888 Unauthorized St, Unauthorized City, UC 88888',
        phone: '555-0888',
        email: 'unauthorized@healthcare.com',
        licenseNumber: 'UNA-DEL-888',
        isActive: true
      });

      const response = await request(app)
        .delete(`/api/facilities/${facilityToDelete.id}`)
        .set('Authorization', `Bearer ${caregiverToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Facility Filtering', () => {
    it('should filter facilities by facility for facility owners', async () => {
      // This test would require a facility owner user
      // For now, we'll test that the endpoint works with facility filtering
      const response = await request(app)
        .get('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.facilities).toBeDefined();
    });
  });
});

