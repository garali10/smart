import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid';

const userSchema = new mongoose.Schema({
  id: {
     type: String, default: uuidv4, unique: true
     },  // Automatically generate 'id' using UUID

  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profilePicture: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['hr', 'departmentHead', 'candidate'],
    default: 'candidate'
  },
  banned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Auto-increment for id field
userSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastUser = await this.constructor.findOne({}, {}, { sort: { 'id': -1 } });
    this.id = lastUser ? lastUser.id + 1 : 1;
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Add middleware to handle password updates on findOneAndUpdate
userSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  if (update.password) {
    try {
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(update.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema); 