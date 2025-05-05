import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['multiple-choice', 'scale', 'text'],
    required: true
  },
  difficulty: {
    type: Number,
    enum: [1, 2, 3], // 1: Easy, 2: Medium, 3: Hard
    required: true
  },
  options: [{
    text: String,
    value: Number, // For MBTI, typically -3 to +3
    dimension: {
      type: String,
      enum: ['E-I', 'S-N', 'T-F', 'J-P']
    }
  }],
  category: {
    type: String,
    enum: ['E-I', 'S-N', 'T-F', 'J-P'],
    required: true
  },
  weight: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Track question performance metrics
  performanceMetrics: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    correctAttempts: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Question = mongoose.model('Question', questionSchema);

export default Question; 