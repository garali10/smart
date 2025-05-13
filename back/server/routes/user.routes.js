import express from 'express';
import { authMiddleware, authorize } from '../middleware/auth.middleware.js';
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import { validateProfile, validatePassword } from '../middleware/validate.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure upload directory
const uploadDir = path.join(__dirname, '..', 'uploads', 'profile-pictures');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads directory:', uploadDir);
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter
});

// Get all users (HR only)
router.get('/', authMiddleware, authorize(['hr']), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, upload.single('profilePicture'), async (req, res) => {
  try {
    console.log('Profile update request:', {
      body: req.body,
      file: req.file ? {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype
      } : null
    });

    const updateData = {};

    // Handle text fields
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.email) updateData.email = req.body.email;

    // Handle profile picture
    if (req.file) {
      updateData.profilePicture = req.file.filename;
      
      // Delete old picture if exists
      const user = await User.findById(req.user.id);
      if (user?.profilePicture) {
        const oldPicturePath = path.join(uploadDir, user.profilePicture);
        console.log('Checking old picture:', oldPicturePath);
        if (fs.existsSync(oldPicturePath)) {
          console.log('Deleting old picture:', oldPicturePath);
          fs.unlinkSync(oldPicturePath);
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('-password');

    console.log('Updated user:', updatedUser);
    
    // Include everything in the response that the frontend needs
    res.json({
      id: updatedUser.id,
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      profilePicture: updatedUser.profilePicture,
      role: updatedUser.role
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Change password
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Use findOneAndUpdate to trigger the pre-update middleware
    await User.findOneAndUpdate(
      { _id: req.user.id },
      { password: newPassword },
      { new: true }
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ message: 'Failed to update password' });
  }
});

// Get users by role
router.get('/by-role/:role', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
  try {
    const users = await User.find({ role: req.params.role }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// New role management routes (HR only)
router.patch('/assign-role/:userId', authMiddleware, authorize(['hr']), async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate role
    if (!['hr', 'departmentHead', 'candidate'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    user.role = role;
    await user.save();

    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Test auth route
router.get('/test-auth', authMiddleware, (req, res) => {
  res.json({ 
    message: 'Auth working', 
    user: req.user 
  });
});

// Add this route to check if a profile picture exists
router.get('/profile-picture/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  console.log('Checking profile picture:', filePath);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Profile picture not found' });
  }
});

// Route de test pour les images
router.get('/test-image/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Image not found' });
  }
});

// Get user by ID
router.get('/:id', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email profilePicture role');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Transform the response to include the full profile picture URL
    const userResponse = {
      ...user.toObject(),
      profilePicture: user.profilePicture ? `/api/uploads/profile-pictures/${user.profilePicture}` : null
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user profile', error: error.message });
  }
});

// Delete user (HR only)
router.delete('/:id', authMiddleware, authorize(['hr']), async (req, res) => {
  try {
    let user;
    
    // Try to find user by numeric ID first
    user = await User.findOne({ id: req.params.id });
    
    // If not found by numeric ID, try MongoDB _id
    if (!user) {
      try {
        user = await User.findById(req.params.id);
      } catch (error) {
        // If _id is invalid, continue to next check
      }
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting HR users
    if (user.role === 'hr') {
      return res.status(403).json({ message: 'Cannot delete HR users' });
    }

    await User.findByIdAndDelete(user._id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Toggle ban status for a user (HR only)
router.put('/:id/toggle-ban', authMiddleware, authorize(['hr']), async (req, res) => {
  try {
    const { banned } = req.body;
    
    if (typeof banned !== 'boolean') {
      return res.status(400).json({ message: 'Banned status must be a boolean value' });
    }
    
    let user;
    
    // Try to find user by numeric ID first
    user = await User.findOne({ id: req.params.id });
    
    // If not found by numeric ID, try MongoDB _id
    if (!user) {
      try {
        user = await User.findById(req.params.id);
      } catch (error) {
        // If _id is invalid, continue to next check
      }
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent HR users from banning other HR users (only admins should ban HR)
    if (user.role === 'hr' && req.user.role === 'hr') {
      return res.status(403).json({ message: 'HR users cannot ban other HR users' });
    }
    
    // Update the banned status
    user.banned = banned;
    await user.save();
    
    res.json({ 
      message: banned ? 'User banned successfully' : 'User unbanned successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned
      }
    });
  } catch (error) {
    console.error('Error toggling ban status:', error);
    res.status(500).json({ message: 'Error updating user ban status' });
  }
});

export default router; 