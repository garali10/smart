import mongoose from 'mongoose';

const testSessionSchema = new mongoose.Schema({
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
  currentQuestion: {
    type: String,
  },
  answers: [{
    questionId: {
      type: String,
      required: true
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
    },
    answeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'paused'],
    default: 'in_progress'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // Store the last calculated scores
  lastScores: {
    dimensionScores: {
      'E-I': Number,
      'S-N': Number,
      'T-F': Number,
      'J-P': Number
    },
    confidenceScores: {
      'E-I': Number,
      'S-N': Number,
      'T-F': Number,
      'J-P': Number
    },
    predictedType: String,
    totalScore: Number
  }
}, {
  timestamps: true
});

// Index for faster queries
testSessionSchema.index({ userId: 1, testId: 1, status: 1 });

const TestSession = mongoose.model('TestSession', testSessionSchema);

export default TestSession; 