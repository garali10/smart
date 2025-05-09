import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobListing',
    required: true
  },
  jobTitle: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
    // Not required as applications can be submitted without an account
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  resumeUrl: {
    type: String,
    required: true
  },
  coverLetter: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'shortlisted', 'interviewed', 'joined', 'rejected', 'reviewed', 'accepted'],
    default: 'pending'
  },
  interviewDate: {
    type: Date
  },
  interviewTime: {
    type: String
  },
  meetLink: {
    type: String
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  scoreBreakdown: {
    keySkillsScore: Number,
    roleScore: Number,
    toolsScore: Number,
    experienceScore: Number,
    educationScore: Number,
    softSkillsScore: Number,
    summaryScore: Number,
    orgScore: Number
  },
  mbtiResult: {
    personalityType: {
      type: String,
      required: false
    },
    dimensionScores: {
      type: Map,
      of: Number,
      required: false
    }
  },
  feedback: {
    type: String
  },
  cvAnalysis: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  source: {
    type: String,
    default: 'Direct'
  },
  joinedDate: Date
}, {
  timestamps: true
});

const Application = mongoose.model('Application', applicationSchema);

export default Application;
