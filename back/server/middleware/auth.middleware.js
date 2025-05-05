import jwt from 'jsonwebtoken';

// Verifies JWT token
export const authMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }

    // Ensure proper Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Invalid token format. Please log in again.' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Invalid token. Please log in again.' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Set user info in request
      req.user = {
        _id: decoded.id || decoded._id, // Support both formats
        id: decoded.id || decoded._id,  // Support both formats
        role: decoded.role
      };
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired. Please log in again.' });
      }
      return res.status(401).json({ message: 'Invalid token. Please log in again.' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Server error during authentication' });
  }
};

// Role-based authorization
export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ 
        message: 'Not authorized to access this resource' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required roles: ${roles.join(', ')}` 
      });
    }

    next();
  };
}; 