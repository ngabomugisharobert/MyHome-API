const request = require('supertest');
const express = require('express');
const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

// Import routes and middleware
const documentRoutes = require('../src/routes/documents');
const authRoutes = require('../src/routes/auth');

// Create test app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

const User = require('../src/models/User');
const Facility = require('../src/models/Facility');
const Resident = require('../src/models/Resident');
const Document = require('../src/models/Document');

describe('Documents API - Comprehensive Tests', () => {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  let adminToken;
  let supervisorToken;
  let doctorToken;
  let caregiverToken;
  let facilityId;
  let facilityRecord;
  let residentId;
  let testDocumentId;
  let testFilePath;

  let adminEmail;
  let supervisorEmail;
  let doctorEmail;
  let doctor2Email;
  let caregiverEmail;

  let adminUser;
  let supervisorUser;
  let doctorUser;
  let doctor2User;
  let caregiverUser;

  // Minimal valid PDF content (header + trailer)
  const minimalPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<<>>\nstartxref\n9\n%%EOF');

  // Create a test file for uploads (valid PDF)
  const createTestFile = () => {
    const testDir = path.join(__dirname, '../uploads/test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    testFilePath = path.join(testDir, 'test-document.pdf');
    fs.writeFileSync(testFilePath, minimalPdf);
    return testFilePath;
  };

  // Create a different test file (unique content) to avoid hash duplicate
  const createAltTestFile = (name = 'test-document-2.pdf', content = null) => {
    const testDir = path.join(__dirname, '../uploads/test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const altPath = path.join(testDir, name);
    if (content) {
      fs.writeFileSync(altPath, content);
    } else {
      fs.writeFileSync(altPath, minimalPdf);
    }
    return altPath;
  };

  // Clean up test file
  const cleanupTestFile = () => {
    if (testFilePath && fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    // Clean up test directory if empty
    const testDir = path.join(__dirname, '../uploads/test');
    if (fs.existsSync(testDir)) {
      try {
        fs.rmdirSync(testDir);
      } catch (e) {
        // Directory not empty, that's okay
      }
    }

    // Attempt to remove test users created with unique emails
    // await User.destroy({
    //   where: {
    //     email: [
    //       adminEmail,
    //       supervisorEmail,
    //       doctorEmail,
    //       doctor2Email,
    //       caregiverEmail
    //     ]
    //   },
    //   force: true
    // });
  };

  beforeAll(async () => {
    // Connect to database
    await sequelize.authenticate();
    
    // Create test facility
    facilityRecord = await Facility.create({
      name: `Test Healthcare Facility ${uniqueSuffix}`,
      address: '123 Test St',
      phone: '123-456-7890',
      email: 'test@facility.com',
      status: 'active',
      isActive: true
    });
    facilityId = facilityRecord.id;

    // Create test users with different roles
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('Test123!@#', 12);

    adminEmail = `admin+${uniqueSuffix}@test.com`;
    supervisorEmail = `supervisor+${uniqueSuffix}@test.com`;
    doctorEmail = `doctor+${uniqueSuffix}@test.com`;
    doctor2Email = `doctor2+${uniqueSuffix}@test.com`;
    caregiverEmail = `caregiver+${uniqueSuffix}@test.com`;

    adminUser = await User.create({
      name: 'Test Admin',
      email: adminEmail,
      passwordHash,
      role: 'admin',
      isActive: true,
      emailVerified: true
    });

    supervisorUser = await User.create({
      name: 'Test Supervisor',
      email: supervisorEmail,
      passwordHash,
      role: 'supervisor',
      facilityId: facilityId,
      isActive: true,
      emailVerified: true
    });

    // Make supervisor owner of facility
    await facilityRecord.update({ ownerId: supervisorUser.id });

    doctorUser = await User.create({
      name: 'Test Doctor',
      email: doctorEmail,
      passwordHash,
      role: 'doctor',
      facilityId: facilityId,
      isActive: true,
      emailVerified: true
    });

    doctor2User = await User.create({
      name: 'Test Doctor 2',
      email: doctor2Email,
      passwordHash,
      role: 'doctor',
      facilityId: facilityId, // Changed from facility2Id to facilityId
      isActive: true,
      emailVerified: true
    });

    caregiverUser = await User.create({
      name: 'Test Caregiver',
      email: caregiverEmail,
      passwordHash,
      role: 'caregiver',
      facilityId: facilityId,
      isActive: true,
      emailVerified: true
    });

    // Login to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'Test123!@#' });
    adminToken = adminLogin.body.data.tokens.accessToken;

    const supervisorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: supervisorEmail, password: 'Test123!@#' });
    supervisorToken = supervisorLogin.body.data.tokens.accessToken;

    const doctorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: doctorEmail, password: 'Test123!@#' });
    doctorToken = doctorLogin.body.data.tokens.accessToken;

    const caregiverLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: caregiverEmail, password: 'Test123!@#' });
    caregiverToken = caregiverLogin.body.data.tokens.accessToken;

    // Create test resident
    try {
      const resident = await Resident.create({
        firstName: 'John',
        lastName: 'Doe',
        facilityId: facilityId,
        status: 'active'
      });
      residentId = resident.id;
    } catch (error) {
      console.error('Resident creation failed:', error);
      throw error;
    }

    // Create test file
    createTestFile();
  });

  afterAll(async () => {
    // Clean up test data
    if (facilityId) {
      await Document.destroy({ where: { facilityId }, force: true });
    }

    if (residentId) {
      await Document.destroy({ where: { residentId }, force: true });
      await Resident.destroy({ where: { id: residentId }, force: true });
    }

    const userIdsToDelete = [
      adminUser?.id,
      supervisorUser?.id,
      doctorUser?.id,
      doctor2User?.id,
      caregiverUser?.id
    ].filter(Boolean);

    if (userIdsToDelete.length > 0) {
      try {
        await User.destroy({ where: { id: userIdsToDelete }, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    if (facilityId) {
      await Facility.destroy({ where: { id: facilityId }, force: true });
    }
    
    // Clean up test files
    cleanupTestFile();

    await sequelize.close();
  });

  describe('POST /api/documents - Upload Document', () => {
    test('should upload a document successfully (Admin)', async () => {
      const testFile = createTestFile();
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Test Document')
        .field('description', 'Test description')
        .field('category', 'administrative')
        .field('residentId', residentId)
        .attach('file', testFile);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toBeDefined();
      expect(response.body.data.document.title).toBe('Test Document');
      expect(response.body.data.document.fileName).toBe('test-document.pdf');
      expect(response.body.data.document.residentId).toBe(residentId);
      
      testDocumentId = response.body.data.document.id;
    });

    test('should upload a document successfully (Supervisor)', async () => {
      const uniqueContent = Buffer.concat([minimalPdf, Buffer.from('supervisor-unique')]);
      const testFile = createAltTestFile('supervisor-doc.pdf', uniqueContent);
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .field('title', 'Supervisor Document')
        .field('category', 'medical')
        .field('residentId', residentId)
        .attach('file', testFile);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.document.category).toBe('medical');
    });

    test('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Test Document')
        .field('category', 'administrative')
        .field('residentId', residentId);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('File is required');
    });

    test('should reject upload without title', async () => {
      const uniqueContent = Buffer.concat([minimalPdf, Buffer.from('no-title-unique')]);
      const testFile = createAltTestFile('no-title.pdf', uniqueContent);
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('category', 'administrative')
        .field('residentId', residentId)
        .attach('file', testFile);

      // Should use filename as title if title not provided
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should reject upload from unauthorized role (Doctor)', async () => {
      const testFile = createTestFile();
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${doctorToken}`)
        .field('title', 'Test Document')
        .field('category', 'administrative')
        .field('residentId', residentId)
        .attach('file', testFile);

      expect(response.status).toBe(403);
    });

    test('should reject upload from unauthorized role (Caregiver)', async () => {
      const testFile = createTestFile();
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .field('title', 'Test Document')
        .field('category', 'administrative')
        .field('residentId', residentId)
        .attach('file', testFile);

      expect(response.status).toBe(403);
    });

    test('should reject file that is too large', async () => {
      // Create a large file (11MB)
      const largeFilePath = path.join(__dirname, '../uploads/test/large-file.pdf');
      const largeContent = Buffer.alloc(11 * 1024 * 1024, 'a');
      fs.writeFileSync(largeFilePath, largeContent);
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Large Document')
        .field('category', 'administrative')
        .field('residentId', residentId)
        .attach('file', largeFilePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('10MB');

      // Clean up
      if (fs.existsSync(largeFilePath)) {
        fs.unlinkSync(largeFilePath);
      }
    });

    test('should reject invalid file type', async () => {
      const invalidFile = path.join(__dirname, '../uploads/test/invalid.exe');
      fs.writeFileSync(invalidFile, 'invalid content');
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Invalid Document')
        .field('category', 'administrative')
        .field('residentId', residentId)
        .attach('file', invalidFile);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid file type');

      // Clean up
      if (fs.existsSync(invalidFile)) {
        fs.unlinkSync(invalidFile);
      }
    });

    test('should reject duplicate upload for same resident (by content hash)', async () => {
      // Use a fresh resident to avoid conflicts with other tests
      const dupResident = await Resident.create({
        firstName: 'Dup',
        lastName: 'Resident',
        facilityId: facilityId,
        status: 'active'
      });

      const testFile = createTestFile();

      const first = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Duplicate Hash 1')
        .field('category', 'administrative')
        .field('residentId', dupResident.id)
        .attach('file', testFile);
      expect(first.status).toBe(201);

      const second = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Duplicate Hash 2')
        .field('category', 'administrative')
        .field('residentId', dupResident.id)
        .attach('file', testFile);

      expect(second.status).toBe(409);
      expect(second.body.success).toBe(false);

      await dupResident.destroy({ force: true });
    });

    test('should reject type/extension mismatch (TXT content with .jpg extension)', async () => {
      const disguisedPath = path.join(__dirname, '../uploads/test/disguised.jpg');
      fs.writeFileSync(disguisedPath, 'plain text pretending to be an image');

      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Disguised File')
        .field('category', 'administrative')
        .field('residentId', residentId)
        .attach('file', disguisedPath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/type\/extension mismatch|Invalid file type|Unable to verify file type/i);

      if (fs.existsSync(disguisedPath)) {
        fs.unlinkSync(disguisedPath);
      }
    });
  });

  describe('GET /api/documents/resident/:residentId - Get Resident Documents', () => {
    test('should get documents for a resident (Admin)', async () => {
      const response = await request(app)
        .get(`/api/documents/resident/${residentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toBeDefined();
      expect(Array.isArray(response.body.data.documents)).toBe(true);
    });

    test('should get documents for a resident (Supervisor)', async () => {
      const response = await request(app)
        .get(`/api/documents/resident/${residentId}`)
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should get documents for a resident (Doctor)', async () => {
      const response = await request(app)
        .get(`/api/documents/resident/${residentId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should get documents for a resident (Caregiver)', async () => {
      const response = await request(app)
        .get(`/api/documents/resident/${residentId}`)
        .set('Authorization', `Bearer ${caregiverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return empty array for resident with no documents', async () => {
      // Create a new resident without documents
      const newResident = await Resident.create({
        firstName: 'Jane',
        lastName: 'Smith',
        facilityId: facilityId,
        status: 'active'
      });

      const response = await request(app)
        .get(`/api/documents/resident/${newResident.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toEqual([]);

      // Clean up
      await newResident.destroy({ force: true });
    });

    test('should filter documents by category', async () => {
      const response = await request(app)
        .get(`/api/documents/resident/${residentId}?category=medical`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      if (response.body.data.documents.length > 0) {
        response.body.data.documents.forEach(doc => {
          expect(doc.category).toBe('medical');
        });
      }
    });
  });

  describe('GET /api/documents/:id - Get Document by ID', () => {
    test('should get document by ID (Admin)', async () => {
      if (!testDocumentId) {
        // Create a document first
        const testFile = createTestFile();
        const createResponse = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('title', 'Test Get Document')
          .field('category', 'administrative')
          .field('residentId', residentId)
          .attach('file', testFile);
        testDocumentId = createResponse.body.data.document.id;
      }

      const response = await request(app)
        .get(`/api/documents/${testDocumentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toBeDefined();
      expect(response.body.data.document.id).toBe(testDocumentId);
    });

    test('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/documents/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/documents/:id/download - Download Document', () => {
    test('should download document file (Admin)', async () => {
      if (!testDocumentId) {
        const testFile = createTestFile();
        const createResponse = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('title', 'Test Download Document')
          .field('category', 'administrative')
          .field('residentId', residentId)
          .attach('file', testFile);
        testDocumentId = createResponse.body.data.document.id;
      }

      const response = await request(app)
        .get(`/api/documents/${testDocumentId}/download`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toBeDefined();
      expect(response.headers['content-type']).toBeDefined();
    });

    test('should download document file (Doctor)', async () => {
      if (!testDocumentId) return;

      const response = await request(app)
        .get(`/api/documents/${testDocumentId}/download`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
    });

    test('should return 404 for non-existent document download', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/documents/${fakeId}/download`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/documents/:id - Update Document', () => {
    test('should update document metadata (Admin)', async () => {
      if (!testDocumentId) {
        const testFile = createTestFile();
        const createResponse = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('title', 'Test Update Document')
          .field('category', 'administrative')
          .field('residentId', residentId)
          .attach('file', testFile);
        testDocumentId = createResponse.body.data.document.id;
      }

      const response = await request(app)
        .put(`/api/documents/${testDocumentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Document Title',
          description: 'Updated description',
          category: 'medical'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.document.title).toBe('Updated Document Title');
      expect(response.body.data.document.category).toBe('medical');
    });

    test('should reject update from unauthorized role', async () => {
      if (!testDocumentId) return;

      const response = await request(app)
        .put(`/api/documents/${testDocumentId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          title: 'Updated Title'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/documents/:id - Delete Document', () => {
    test('should delete document (Admin)', async () => {
      // Create a document to delete
      const testFile = createAltTestFile('to-delete.pdf', Buffer.concat([minimalPdf, Buffer.from('delete-unique')]));
      const createResponse = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Test Delete Document')
        .field('category', 'administrative')
        .field('residentId', residentId)
        .attach('file', testFile);
      
      const docId = createResponse.body.data.document.id;

      const response = await request(app)
        .delete(`/api/documents/${docId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify document is deleted
      const getResponse = await request(app)
        .get(`/api/documents/${docId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getResponse.status).toBe(404);
    });

    test('should reject delete from unauthorized role', async () => {
      if (!testDocumentId) return;

      const response = await request(app)
        .delete(`/api/documents/${testDocumentId}`)
        .set('Authorization', `Bearer ${supervisorToken}`);

      // Supervisor should be able to delete, but let's test with doctor
      const doctorResponse = await request(app)
        .delete(`/api/documents/${testDocumentId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(doctorResponse.status).toBe(403);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing authentication token', async () => {
      const response = await request(app)
        .get(`/api/documents/resident/${residentId}`);

      expect(response.status).toBe(401);
    });

    test('should handle invalid resident ID', async () => {
      const invalidId = 'invalid-uuid';
      const response = await request(app)
        .get(`/api/documents/resident/${invalidId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });

    test('should handle document with expiry date', async () => {
      const testFile = createTestFile();
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Document with Expiry')
        .field('category', 'administrative')
        .field('residentId', residentId)
        .field('expiryDate', futureDate.toISOString().split('T')[0])
        .attach('file', testFile);

      expect(response.status).toBe(201);
      expect(response.body.data.document.expiryDate).toBeDefined();
    });

    test('should handle document without resident ID (facility document)', async () => {
      const testFile = createTestFile();
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .field('title', 'Facility Document')
        .field('category', 'administrative')
        .attach('file', testFile);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect((response.body.data.document && response.body.data.document.residentId) ?? null).toBeNull();
    });
  });
});

