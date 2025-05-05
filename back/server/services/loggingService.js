import TestSession from '../models/TestSession.js';
import TestLog from '../models/TestLog.js';
import AnomalyLog from '../models/AnomalyLog.js';

class LoggingService {
  async logSessionEvent(sessionId, eventType, details) {
    try {
      const log = new TestLog({
        sessionId,
        eventType,
        details,
        timestamp: new Date()
      });

      await log.save();
      return log;
    } catch (error) {
      console.error('Error logging session event:', error);
      throw error;
    }
  }

  async logAnomaly(sessionId, anomalyType, details) {
    try {
      const anomaly = new AnomalyLog({
        sessionId,
        anomalyType,
        details,
        timestamp: new Date(),
        status: 'pending'
      });

      await anomaly.save();
      return anomaly;
    } catch (error) {
      console.error('Error logging anomaly:', error);
      throw error;
    }
  }

  async detectAnomalies(session, answer) {
    const anomalies = [];

    // Check for unusually quick responses
    if (answer.responseTime < 2) {
      anomalies.push({
        type: 'QUICK_RESPONSE',
        details: {
          questionId: answer.questionId,
          responseTime: answer.responseTime
        }
      });
    }

    // Check for inconsistent dimension scores
    const dimensionScores = session.answers.reduce((acc, ans) => {
      if (!acc[ans.dimension]) acc[ans.dimension] = [];
      acc[ans.dimension].push(ans.score);
      return acc;
    }, {});

    for (const [dimension, scores] of Object.entries(dimensionScores)) {
      if (scores.length > 2) {
        const variance = this.calculateVariance(scores);
        if (variance > 1.5) {
          anomalies.push({
            type: 'INCONSISTENT_DIMENSION',
            details: {
              dimension,
              variance,
              scores
            }
          });
        }
      }
    }

    // Check for session duration anomalies
    const sessionDuration = (new Date() - session.startTime) / 1000 / 60; // in minutes
    if (sessionDuration < 5 && session.answers.length > 10) {
      anomalies.push({
        type: 'RUSHED_SESSION',
        details: {
          duration: sessionDuration,
          questionCount: session.answers.length
        }
      });
    }

    return anomalies;
  }

  async getSessionLogs(sessionId) {
    try {
      const logs = await TestLog.find({ sessionId })
        .sort({ timestamp: -1 });
      return logs;
    } catch (error) {
      console.error('Error fetching session logs:', error);
      throw error;
    }
  }

  async getAnomalies(sessionId) {
    try {
      const anomalies = await AnomalyLog.find({ sessionId })
        .sort({ timestamp: -1 });
      return anomalies;
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      throw error;
    }
  }

  calculateVariance(scores) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
  }
}

export default new LoggingService(); 