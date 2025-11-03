const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../../src/config/config');
const { authenticateToken, authorize } = require('../../src/middleware/auth');

// Mock the User model
jest.mock('../../src/models/User', () => ({
  findByPk: jest.fn()
}));

const User = require('../../src/models/User');

describe('Authentication Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken middleware', () => {
    it('should authenticate valid token', async () => {
      const token = jwt.sign({ userId: 'test-user-id' }, config.jwt.secret);
      mockReq.headers.authorization = `Bearer ${token}`;

      User.findByPk.mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        isActive: true
      });

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe('test-user-id');
    });

    it('should reject request without token', async () => {
      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid_token';

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    beforeEach(() => {
      mockReq.user = { id: 'test-user-id', role: 'admin' };
    });

    it('should authorize user with correct role', () => {
      const authorizeAdmin = authorize('admin');
      authorizeAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject user with incorrect role', () => {
      mockReq.user.role = 'caregiver';
      const authorizeAdmin = authorize('admin');
      authorizeAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Password hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'testpassword123';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d+\$/);
      
      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });
  });

  describe('JWT token generation', () => {
    it('should generate valid JWT token', () => {
      const payload = { userId: 'test-user-id' };
      const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = jwt.verify(token, config.jwt.secret);
      expect(decoded.userId).toBe('test-user-id');
    });

    it('should reject invalid JWT token', () => {
      expect(() => {
        jwt.verify('invalid-token', config.jwt.secret);
      }).toThrow();
    });
  });
});



