const jwt = require('jsonwebtoken');
const config = require('../../src/config/config');
const { authenticateToken, authorize } = require('../../src/middleware/auth');

// Mock the User model
jest.mock('../../src/models/User', () => ({
  findByPk: jest.fn()
}));

const User = require('../../src/models/User');

describe('Auth Middleware', () => {
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

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      const token = jwt.sign({ userId: 'test-user-id' }, config.jwt.secret);
      mockReq.headers.authorization = `Bearer ${token}`;

      // Mock User.findByPk to return a user
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
      expect(mockReq.user.email).toBe('test@example.com');
      expect(mockReq.user.role).toBe('admin');
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

    it('should reject request without Bearer prefix', async () => {
      mockReq.headers.authorization = 'invalid_token';

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
        message: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test-user-id' }, 
        config.jwt.secret, 
        { expiresIn: '-1h' }
      );
      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject when user not found', async () => {
      const token = jwt.sign({ userId: 'non-existent-user' }, config.jwt.secret);
      mockReq.headers.authorization = `Bearer ${token}`;

      User.findByPk.mockResolvedValue(null);

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject inactive user', async () => {
      const token = jwt.sign({ userId: 'test-user-id' }, config.jwt.secret);
      mockReq.headers.authorization = `Bearer ${token}`;

      User.findByPk.mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        isActive: false
      });

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account is deactivated'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const token = jwt.sign({ userId: 'test-user-id' }, config.jwt.secret);
      mockReq.headers.authorization = `Bearer ${token}`;

      User.findByPk.mockRejectedValue(new Error('Database connection failed'));

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication error'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    beforeEach(() => {
      mockReq.user = { id: 'test-user-id', role: 'admin' };
    });

    it('should authorize user with correct role', () => {
      const authorizeAdmin = authorize('admin');
      authorizeAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should authorize user with one of multiple allowed roles', () => {
      const authorizeAdminOrSupervisor = authorize('admin', 'supervisor');
      authorizeAdminOrSupervisor(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should authorize user with multiple roles (admin)', () => {
      mockReq.user.role = 'admin';
      const authorizeMultiple = authorize('admin', 'supervisor', 'doctor');
      authorizeMultiple(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should authorize user with multiple roles (supervisor)', () => {
      mockReq.user.role = 'supervisor';
      const authorizeMultiple = authorize('admin', 'supervisor', 'doctor');
      authorizeMultiple(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
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

    it('should reject user with role not in allowed list', () => {
      mockReq.user.role = 'doctor';
      const authorizeAdminOrSupervisor = authorize('admin', 'supervisor');
      authorizeAdminOrSupervisor(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without user', () => {
      delete mockReq.user;
      const authorizeAdmin = authorize('admin');
      authorizeAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with null user', () => {
      mockReq.user = null;
      const authorizeAdmin = authorize('admin');
      authorizeAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with user without role', () => {
      mockReq.user = { id: 'test-user-id' }; // No role property
      const authorizeAdmin = authorize('admin');
      authorizeAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty allowed roles array', () => {
      const authorizeNone = authorize();
      authorizeNone(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
