const { filterByFacility, checkFacilityAccess } = require('../../src/middleware/facilityFilter');

describe('Facility Filter Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      user: null,
      facilityFilter: undefined,
      params: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('filterByFacility', () => {
    it('should set facilityFilter for user with facilityId', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'supervisor', 
        facilityId: 'facility-123' 
      };

      filterByFacility(mockReq, mockRes, mockNext);

      expect(mockReq.facilityFilter).toEqual({ facilityId: 'facility-123' });
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should not set facilityFilter for user without facilityId', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'admin' 
        // No facilityId
      };

      filterByFacility(mockReq, mockRes, mockNext);

      expect(mockReq.facilityFilter).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should not set facilityFilter for user with null facilityId', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'supervisor', 
        facilityId: null 
      };

      filterByFacility(mockReq, mockRes, mockNext);

      expect(mockReq.facilityFilter).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not set facilityFilter for user with undefined facilityId', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'supervisor', 
        facilityId: undefined 
      };

      filterByFacility(mockReq, mockRes, mockNext);

      expect(mockReq.facilityFilter).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not set facilityFilter for user without user object', () => {
      filterByFacility(mockReq, mockRes, mockNext);

      expect(mockReq.facilityFilter).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not set facilityFilter for null user', () => {
      mockReq.user = null;

      filterByFacility(mockReq, mockRes, mockNext);

      expect(mockReq.facilityFilter).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should preserve existing facilityFilter', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'supervisor', 
        facilityId: 'facility-456' 
      };
      mockReq.facilityFilter = { facilityId: 'existing-facility' };

      filterByFacility(mockReq, mockRes, mockNext);

      expect(mockReq.facilityFilter).toEqual({ facilityId: 'facility-456' });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty string facilityId', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'supervisor', 
        facilityId: '' 
      };

      filterByFacility(mockReq, mockRes, mockNext);

      expect(mockReq.facilityFilter).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('checkFacilityAccess', () => {
    it('should allow access to own facility', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'supervisor', 
        facilityId: 'facility-123' 
      };
      mockReq.params = { id: 'facility-123' };

      checkFacilityAccess(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should allow access for admin to any facility', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'admin', 
        facilityId: 'facility-123' 
      };
      mockReq.params = { id: 'facility-456' };

      checkFacilityAccess(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should allow access for admin without facilityId', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'admin' 
        // No facilityId
      };
      mockReq.params = { id: 'facility-456' };

      checkFacilityAccess(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should deny access to different facility for non-admin', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'supervisor', 
        facilityId: 'facility-123' 
      };
      mockReq.params = { id: 'facility-456' };

      checkFacilityAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied to this facility'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access for user without facilityId to any facility', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'supervisor' 
        // No facilityId
      };
      mockReq.params = { id: 'facility-456' };

      checkFacilityAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied to this facility'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access for user with null facilityId', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'supervisor', 
        facilityId: null 
      };
      mockReq.params = { id: 'facility-456' };

      checkFacilityAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied to this facility'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing params.id', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'supervisor', 
        facilityId: 'facility-123' 
      };
      mockReq.params = {}; // No id

      checkFacilityAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied to this facility'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle null params', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'supervisor', 
        facilityId: 'facility-123' 
      };
      mockReq.params = null;

      checkFacilityAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied to this facility'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle undefined params', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'supervisor', 
        facilityId: 'facility-123' 
      };
      mockReq.params = undefined;

      checkFacilityAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied to this facility'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing user object', () => {
      mockReq.params = { id: 'facility-123' };

      checkFacilityAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied to this facility'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle null user', () => {
      mockReq.user = null;
      mockReq.params = { id: 'facility-123' };

      checkFacilityAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied to this facility'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle case sensitivity in role comparison', () => {
      mockReq.user = { 
        id: 'user-123', 
        role: 'ADMIN', // Uppercase
        facilityId: 'facility-123' 
      };
      mockReq.params = { id: 'facility-456' };

      checkFacilityAccess(mockReq, mockRes, mockNext);

      // Should still deny because role comparison is case-sensitive
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied to this facility'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
