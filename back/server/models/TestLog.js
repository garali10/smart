import mongoose from 'mongoose';

const testLogSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSession',
    required: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'SESSION_START',
      'SESSION_PAUSE',
      'SESSION_RESUME',
      'SESSION_COMPLETE',
      'QUESTION_ANSWERED',
      'SCORE_UPDATE',
      'ANOMALY_DETECTED'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const TestLog = mongoose.model('TestLog', testLogSchema);

export default TestLog; 