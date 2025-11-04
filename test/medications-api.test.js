const request = require('supertest');
const express = require('express');
const { sequelize } = require('../src/config/database');

const medicationRoutes = require('../src/routes/medications');
const authRoutes = require('../src/routes/auth');
const createHealthcareFeaturesTables = require('../src/database/migrations/create-healthcare-features-tables');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/medications', medicationRoutes);

const Facility = require('../src/models/Facility');
const User = require('../src/models/User');
const Resident = require('../src/models/Resident');
const Medication = require('../src/models/Medication');
const MedicationSchedule = require('../src/models/MedicationSchedule');
const MedicationAdministration = require('../src/models/MedicationAdministration');

describe('Medications API - Comprehensive Tests', () => {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;

  let facilityId;
  let facility2Id;
  let residentId;
  let residentFacility2Id;
  let medicationId;
  let medicationFacility2Id;
  let scheduleId;
  let administrationId;

  let adminToken;
  let supervisorToken;
  let doctorToken;
  let doctor2Token;
  let caregiverToken;

  let adminUser;
  let supervisorUser;
  let doctorUser;
  let doctor2User;
  let caregiverUser;

  const adminEmail = `admin+${uniqueSuffix}@test.com`;
  const supervisorEmail = `supervisor+${uniqueSuffix}@test.com`;
  const doctorEmail = `doctor+${uniqueSuffix}@test.com`;
  const doctor2Email = `doctor2+${uniqueSuffix}@test.com`;
  const caregiverEmail = `caregiver+${uniqueSuffix}@test.com`;

  beforeAll(async () => {
    await sequelize.authenticate();
    await createHealthcareFeaturesTables();

    facilityId = (
      await Facility.create({
        name: `Medication Test Facility ${uniqueSuffix}`,
        address: '123 Test St',
        phone: '111-111-1111',
        email: `facility-${uniqueSuffix}@example.com`,
        status: 'active',
        isActive: true
      })
    ).id;

    facility2Id = (
      await Facility.create({
        name: `Medication Test Facility 2 ${uniqueSuffix}`,
        address: '456 Test Ave',
        phone: '222-222-2222',
        email: `facility2-${uniqueSuffix}@example.com`,
        status: 'active',
        isActive: true
      })
    ).id;

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('Test123!@#', 12);

    adminUser = await User.create({
      name: 'Medication Admin',
      email: adminEmail,
      passwordHash,
      role: 'admin',
      isActive: true,
      emailVerified: true
    });

    supervisorUser = await User.create({
      name: 'Medication Supervisor',
      email: supervisorEmail,
      passwordHash,
      role: 'supervisor',
      facilityId,
      isActive: true,
      emailVerified: true
    });

    await Facility.update({ ownerId: supervisorUser.id }, { where: { id: facilityId } });

    doctorUser = await User.create({
      name: 'Medication Doctor',
      email: doctorEmail,
      passwordHash,
      role: 'doctor',
      facilityId,
      isActive: true,
      emailVerified: true
    });

    doctor2User = await User.create({
      name: 'Medication Doctor 2',
      email: doctor2Email,
      passwordHash,
      role: 'doctor',
      facilityId: facility2Id,
      isActive: true,
      emailVerified: true
    });

    caregiverUser = await User.create({
      name: 'Medication Caregiver',
      email: caregiverEmail,
      passwordHash,
      role: 'caregiver',
      facilityId,
      isActive: true,
      emailVerified: true
    });

    const login = async (email) => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test123!@#' });
      return response.body.data.tokens.accessToken;
    };

    adminToken = await login(adminEmail);
    supervisorToken = await login(supervisorEmail);
    doctorToken = await login(doctorEmail);
    doctor2Token = await login(doctor2Email);
    caregiverToken = await login(caregiverEmail);

    residentId = (
      await Resident.create({
        firstName: 'Facility One',
        lastName: 'Resident',
        facilityId,
        status: 'active'
      })
    ).id;

    residentFacility2Id = (
      await Resident.create({
        firstName: 'Facility Two',
        lastName: 'Resident',
        facilityId: facility2Id,
        status: 'active'
      })
    ).id;

    medicationId = (
      await Medication.create({
        name: 'Acetaminophen',
        genericName: 'Paracetamol',
        dosage: '500mg',
        form: 'tablet',
        route: 'oral',
        strength: '500mg',
        manufacturer: 'HealthPharma',
        ndcNumber: `ACETA-${uniqueSuffix}`,
        facilityId,
        status: 'active'
      })
    ).id;

    medicationFacility2Id = (
      await Medication.create({
        name: 'Ibuprofen',
        genericName: 'Ibuprofen',
        dosage: '200mg',
        form: 'tablet',
        route: 'oral',
        strength: '200mg',
        manufacturer: 'ReliefCorp',
        ndcNumber: `IBU-${uniqueSuffix}`,
        facilityId: facility2Id,
        status: 'active'
      })
    ).id;
  });

  afterAll(async () => {
    if (administrationId) {
      await MedicationAdministration.destroy({ where: { id: administrationId }, force: true });
    }
    if (scheduleId) {
      await MedicationSchedule.destroy({ where: { id: scheduleId }, force: true });
    }
    await MedicationAdministration.destroy({ where: {}, force: true });
    await MedicationSchedule.destroy({ where: {}, force: true });
    await Medication.destroy({ where: {}, force: true });
    await Resident.destroy({ where: {}, force: true });
    await User.destroy({ where: { id: [adminUser.id, supervisorUser.id, doctorUser.id, doctor2User.id, caregiverUser.id] }, force: true });
    await Facility.destroy({ where: { id: [facilityId, facility2Id] }, force: true });

    await sequelize.close();
  });

  describe('POST /api/medications', () => {
    test('should allow admin to create medication for any facility', async () => {
      const response = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Metformin',
          dosage: '500mg',
          form: 'tablet',
          route: 'oral',
          facilityId
        });

      expect(response.status).toBe(201);
      expect(response.body.data.medication).toBeDefined();
      expect(response.body.data.medication.facilityId).toBe(facilityId);
    });

    test('should default doctor medication to their facility', async () => {
      const response = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          name: 'Lisinopril',
          dosage: '20mg',
          form: 'tablet',
          route: 'oral'
        });

      if (response.status !== 201) {
        console.log('Doctor create medication response:', response.body);
      }
      expect(response.status).toBe(201);
      expect(response.body.data.medication.facilityId).toBe(facilityId);
    });

    test('should reject invalid form', async () => {
      const response = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Invalid',
          dosage: '10mg',
          form: 'powder',
          route: 'oral',
          facilityId
        });

      expect(response.status).toBe(400);
    });

    test('should prevent supervisor from using another facility', async () => {
      const response = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          name: 'Facility Mismatch',
          dosage: '25mg',
          form: 'tablet',
          route: 'oral',
          facilityId: facility2Id
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/medications', () => {
    test('should restrict doctor view to their facility', async () => {
      const response = await request(app)
        .get('/api/medications')
        .set('Authorization', `Bearer ${doctor2Token}`);

      if (response.status !== 200) {
        console.log('Doctor facility filter response:', response.body);
      }
      expect(response.status).toBe(200);
      expect(
        response.body.data.medications.every((med) => med.facilityId === facility2Id)
      ).toBe(true);
    });
  });

  describe('GET /api/medications/:id', () => {
    test('should deny access to medication from another facility', async () => {
      const response = await request(app)
        .get(`/api/medications/${medicationFacility2Id}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      if (response.status !== 403) {
        console.log('Medication access check response:', response.body);
      }
      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/medications/:id', () => {
    test('should allow admin to update status', async () => {
      const response = await request(app)
        .put(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'inactive' });

      expect(response.status).toBe(200);
      expect(response.body.data.medication.status).toBe('inactive');
    });

    test('should reject invalid status', async () => {
      const response = await request(app)
        .put(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'unknown' });

      expect(response.status).toBe(400);
    });
  });

  describe('Medication schedules', () => {
    test('should create schedule for resident', async () => {
      const startDate = new Date().toISOString();
      const response = await request(app)
        .post('/api/medications/schedules')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          residentId,
          medicationId,
          dosage: '500mg',
          frequency: 'twice_daily',
          startDate,
          instructions: 'Take with food'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.schedule).toBeDefined();
      scheduleId = response.body.data.schedule.id;
    });

    test('should reject mismatched facility for schedule', async () => {
      const response = await request(app)
        .post('/api/medications/schedules')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          residentId,
          medicationId: medicationFacility2Id,
          dosage: '500mg',
          frequency: 'once_daily',
          startDate: new Date().toISOString()
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Medication administration', () => {
    test('should require reason when status is missed', async () => {
      const response = await request(app)
        .post(`/api/medications/administrations/schedule/${scheduleId}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          scheduledTime: new Date().toISOString(),
          status: 'missed'
        });

      expect(response.status).toBe(400);
    });

    test('should record administration successfully', async () => {
      const response = await request(app)
        .post(`/api/medications/administrations/schedule/${scheduleId}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          scheduledTime: new Date().toISOString(),
          status: 'administered',
          doseGiven: '500mg'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.administration).toBeDefined();
      administrationId = response.body.data.administration.id;
    });
  });

  describe('GET /api/medications/administrations', () => {
    test('should list administrations for caregiver facility', async () => {
      const response = await request(app)
        .get('/api/medications/administrations')
        .set('Authorization', `Bearer ${caregiverToken}`);

      if (response.status !== 200) {
        console.log('Administrations list response:', response.body);
      }
      expect(response.status).toBe(200);
      expect(response.body.data.administrations.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/medications/stats', () => {
    test('should return medication statistics', async () => {
      const response = await request(app)
        .get('/api/medications/stats')
        .query({ residentId })
        .set('Authorization', `Bearer ${doctorToken}`);

      if (response.status !== 200) {
        console.log('Medication stats response:', response.body);
      }
      expect(response.status).toBe(200);
      expect(response.body.data.totalScheduled).toBeGreaterThanOrEqual(1);
    });
  });
});
