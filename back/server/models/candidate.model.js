import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
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
  resume: {
    type: String,
    required: true
  },
  skills: [{
    type: String,
    required: true
  }],
  experience: {
    type: Number,
    required: true
  },
  education: [{
    type: String,
    required: true
  }],
  applied_jobs: [{
    type: Number,
    ref: 'Job'
  }],
  psyco_test_result: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

// Add auto-increment for id field
candidateSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastCandidate = await this.constructor.findOne({}, {}, { sort: { 'id': -1 } });
    this.id = lastCandidate ? lastCandidate.id + 1 : 1;
  }
  next();
});

export default mongoose.model('Candidate', candidateSchema); 