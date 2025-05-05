import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  // Additional job info fields
  jobTitle: {
    type: String,
    required: true
  },
  company: {
    type: String
  },
  location: {
    type: String
  },
  // Applicant information
  applicant: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String
    },
    resume: {
      type: String
    }
  },
  status: {
    type: String,
    enum: ['pending', 'shortlisted', 'interviewed', 'joined', 'rejected'],
    default: 'pending'
  },
  resumeUrl: {
    type: String,
    required: true
  },
  coverLetter: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  scoreBreakdown: {
    type: Object,
    default: {}
  },
  cvAnalysis: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CVAnalysis'
  },
  analysis: {
    type: Object
  },
  // MBTI related fields
  mbtiResult: {
    type: String
  },
  mbtiScores: {
    type: Object
  },
  feedback: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
applicationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Application = mongoose.model('Application', applicationSchema);

export default Application; 