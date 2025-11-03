const jwt = require('jsonwebtoken');
const config = require('../config/config');

// In-memory session store (in production, use Redis or database)
const activeSessions = new Map();

// Session management middleware
const sessionManager = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const userId = decoded.userId;
    
    // Check if session is active
    if (activeSessions.has(userId)) {
      const session = activeSessions.get(userId);
      const now = new Date();
      
      // Check if session has expired
      if (now > session.expiresAt) {
        activeSessions.delete(userId);
        return res.status(401).json({
          success: false,
          message: 'Session expired'
        });
      }
      
      // Update last activity
      session.lastActivity = now;
      activeSessions.set(userId, session);
      
      // Add session info to request
      req.session = session;
    }
    
    next();
  } catch (error) {
    console.error('Session verification error:', error);
    next();
  }
};

// Create new session
const createSession = (userId, tokens) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  
  const session = {
    userId,
    tokens,
    createdAt: now,
    lastActivity: now,
    expiresAt,
    isActive: true
  };
  
  activeSessions.set(userId, session);
  return session;
};

// Update session tokens
const updateSession = (userId, tokens) => {
  if (activeSessions.has(userId)) {
    const session = activeSessions.get(userId);
    session.tokens = tokens;
    session.lastActivity = new Date();
    activeSessions.set(userId, session);
    return session;
  }
  return null;
};

// Remove session
const removeSession = (userId) => {
  activeSessions.delete(userId);
};

// Get user session
const getUserSession = (userId) => {
  return activeSessions.get(userId);
};

// Clean up expired sessions
const cleanupExpiredSessions = () => {
  const now = new Date();
  for (const [userId, session] of activeSessions.entries()) {
    if (now > session.expiresAt) {
      activeSessions.delete(userId);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

module.exports = {
  sessionManager,
  createSession,
  updateSession,
  removeSession,
  getUserSession,
  cleanupExpiredSessions
};



