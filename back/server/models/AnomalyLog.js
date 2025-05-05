import mongoose from 'mongoose';

const anomalyLogSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSession',
    required: true
  },
  anomalyType: {
    type: String,
    required: true,
    enum: [
      'QUICK_RESPONSE',
      'INCONSISTENT_DIMENSION',
      'RUSHED_SESSION',
      'UNUSUAL_PATTERN',
      'SYSTEM_ERROR'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'reviewed', 'resolved', 'false_positive'],
    default: 'pending'
  },
  resolution: {
    type: String,
    required: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    required: false
  }
});

const AnomalyLog = mongoose.model('AnomalyLog', anomalyLogSchema);

export default AnomalyLog; 