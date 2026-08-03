import jwt from 'jsonwebtoken';
import User from '../modules/users/model.js';
import Role from '../modules/roles/model.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'stockpilot_secret_key_123456789_abcdef_gxyz');

      // Populate user and their role permissions
      req.user = await User.findById(decoded.id).populate('role');
      
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      if (req.user.status !== 'Active') {
        return res.status(403).json({ success: false, message: 'User account is deactivated' });
      }

      next();
    } catch (error) {
      console.error('JWT Auth Error:', error);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

// Check if user has a specific permission
export const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, message: 'Access denied: No role assigned' });
    }

    const { name, permissions } = req.user.role;

    // Admin has override access for all operations
    if (name === 'Admin') {
      return next();
    }

    // Check if permission is directly in the role's permission list
    if (permissions && permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({ success: false, message: `Access denied: Requires permission '${permission}'` });
  };
};
