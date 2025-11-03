const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { sessionManager } = require('./middleware/sessionManager');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const facilityRoutes = require('./routes/facilities');
const teamRoutes = require('./routes/team');
const roleRoutes = require('./routes/roles');
const accessRoutes = require('./routes/access');
const residentRoutes = require('./routes/residents');
const contactRoutes = require('./routes/contacts');
const documentRoutes = require('./routes/documents');
const taskRoutes = require('./routes/tasks');
const inspectionRoutes = require('./routes/inspections');
const facilityAccessRoutes = require('./routes/facilityAccess');
const medicationRoutes = require('./routes/medications');
const carePlanRoutes = require('./routes/carePlans');
const scheduleRoutes = require('./routes/schedules');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Session management middleware
app.use(sessionManager);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/facility-access', facilityAccessRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/care-plans', carePlanRoutes);
app.use('/api/schedules', scheduleRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MyHome API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      facilities: '/api/facilities',
      team: '/api/team',
      roles: '/api/roles',
      access: '/api/access',
      residents: '/api/residents',
      contacts: '/api/contacts',
      documents: '/api/documents',
      tasks: '/api/tasks',
      inspections: '/api/inspections',
      facilityAccess: '/api/facility-access',
      medications: '/api/medications',
      carePlans: '/api/care-plans',
      schedules: '/api/schedules'
    }
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
