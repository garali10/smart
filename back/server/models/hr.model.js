import mongoose from 'mongoose';

const hrSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  department: {
    type: String,
    required: true
  },
  managed_candidates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate'
  }],
  managed_departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DepartmentHead'
  }]
}, {
  timestamps: true
});

// Add auto-increment for id field
hrSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastHR = await this.constructor.findOne({}, {}, { sort: { 'id': -1 } });
    this.id = lastHR ? lastHR.id + 1 : 1;
  }
  next();
});

export default mongoose.model('HR', hrSchema); 