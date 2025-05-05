import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    selectedOption: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    dimension: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    responseTime: {
      type: Number,
      required: true
    }
  }],
  dimensionScores: {
    'E-I': {
      type: Number,
      required: true
    },
    'S-N': {
      type: Number,
      required: true
    },
    'T-F': {
      type: Number,
      required: true
    },
    'J-P': {
      type: Number,
      required: true
    }
  },
  confidenceScores: {
    'E-I': {
      type: Number,
      required: true
    },
    'S-N': {
      type: Number,
      required: true
    },
    'T-F': {
      type: Number,
      required: true
    },
    'J-P': {
      type: Number,
      required: true
    }
  },
  personalityType: {
    type: String,
    enum: ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 
           'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'],
    required: true
  },
  totalScore: {
    type: Number,
    required: true
  },
  progress: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed'],
    default: 'in_progress'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

const Score = mongoose.model('Score', scoreSchema);

export default Score; 