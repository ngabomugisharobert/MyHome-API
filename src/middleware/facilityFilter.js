// Middleware to filter data by facility based on user role and facility access
const filterByFacility = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const user = req.user;
  
  // Admin users can see all data (no facility filtering)
  if (user.role === 'admin') {
    console.log(`🔓 Admin access - no facility filtering for user ${user.email}`);
    return next();
  }

  // Supervisor (owner) users - filter by their owned facilities
  if (user.role === 'supervisor') {
    // If they have a direct facilityId, use it
    if (user.facilityId) {
      req.facilityFilter = {
        facilityId: user.facilityId,
        userRole: 'supervisor'
      };
      console.log(`🏢 Supervisor filtering applied for user ${user.email} (Facility: ${user.facilityId})`);
      return next();
    }
    
    // Otherwise, fetch their owned facilities
    try {
      const Facility = require('../models/Facility');
      const facilities = await Facility.findAll({
        where: {
          ownerId: user.id,
          status: 'active',
          isActive: true
        },
        limit: 1,
        attributes: ['id']
      });
      
      if (facilities.length > 0) {
        req.facilityFilter = {
          facilityId: facilities[0].id,
          userRole: 'supervisor'
        };
        console.log(`🏢 Supervisor filtering applied for user ${user.email} (Owned Facility: ${facilities[0].id})`);
      } else {
        console.warn(`⚠️ No owned facilities found for supervisor ${user.email} (ID: ${user.id})`);
      }
    } catch (error) {
      console.error('Error fetching supervisor facilities:', error);
    }
    
    // Always set facilityFilter even if empty, so controller can check
    if (!req.facilityFilter && user.facilityId) {
      req.facilityFilter = {
        facilityId: user.facilityId,
        userRole: 'supervisor'
      };
      console.log(`🏢 Supervisor using user.facilityId: ${user.facilityId}`);
    }
    
    return next();
  }

  // Doctor users - filter by their selected facility
  if (user.role === 'doctor') {
    if (user.facilityId) {
      req.facilityFilter = {
        facilityId: user.facilityId,
        userRole: 'doctor'
      };
      console.log(`👨‍⚕️ Doctor filtering applied for user ${user.email} (Selected Facility: ${user.facilityId})`);
    }
    return next();
  }

  // Caregiver users - filter by their assigned facility
  if (user.role === 'caregiver') {
    if (user.facilityId) {
      req.facilityFilter = {
        facilityId: user.facilityId,
        userRole: 'caregiver'
      };
      console.log(`👩‍⚕️ Caregiver filtering applied for user ${user.email} (Facility: ${user.facilityId})`);
    }
    return next();
  }

  next();
};

// Middleware to check if user has access to a specific facility
const checkFacilityAccess = (req, res, next) => {
  const requestedFacilityId = req.params.id || req.params.facilityId || req.body.facilityId;
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const user = req.user;
  
  // Admin users can access any facility
  if (user.role === 'admin') {
    return next();
  }
  
  // Supervisor (owner) users - can access their owned facilities
  if (user.role === 'supervisor') {
    // For now, check if they have access to the requested facility
    // In a more complex system, we'd check if they own the facility
    if (requestedFacilityId && requestedFacilityId !== user.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your owned facilities'
      });
    }
    return next();
  }
  
  // Doctor users - can access any facility they select
  if (user.role === 'doctor') {
    // Doctors can access any facility, but we'll filter data by their selected facility
    return next();
  }
  
  // Caregiver users - can only access their assigned facility
  if (user.role === 'caregiver') {
    if (requestedFacilityId && requestedFacilityId !== user.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your assigned facility'
      });
    }
    return next();
  }
  
  next();
};

module.exports = {
  filterByFacility,
  checkFacilityAccess
};
