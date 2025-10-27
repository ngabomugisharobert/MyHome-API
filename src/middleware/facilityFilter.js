// Middleware to filter data by facility based on user role and facility access
const filterByFacility = (req, res, next) => {
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
    // We'll need to get the facilities owned by this user
    // For now, we'll use their facilityId if they have one
    if (user.facilityId) {
      req.facilityFilter = {
        facilityId: user.facilityId,
        userRole: 'supervisor'
      };
      console.log(`🏢 Supervisor filtering applied for user ${user.email} (Facility: ${user.facilityId})`);
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
