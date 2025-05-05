import TestSession from '../models/TestSession.js';
import Score from '../models/Score.js';

class ResultAnalysisService {
  async analyzeResults(userId, testId) {
    try {
      // Get the latest test session and score
      const session = await TestSession.findOne({
        userId,
        testId,
        status: 'completed'
      }).sort({ createdAt: -1 });

      const score = await Score.findOne({
        userId,
        testId
      }).sort({ createdAt: -1 });

      if (!session || !score) {
        throw new Error('No completed test results found');
      }

      // Analyze dimension scores
      const dimensionAnalysis = this.analyzeDimensions(score.dimensionScores);
      
      // Analyze response patterns
      const responsePatterns = this.analyzeResponsePatterns(session.answers);
      
      // Generate personalized feedback
      const feedback = this.generateFeedback(dimensionAnalysis, responsePatterns);

      return {
        dimensionAnalysis,
        responsePatterns,
        feedback,
        personalityType: score.personalityType,
        confidenceScores: score.confidenceScores
      };
    } catch (error) {
      throw new Error(`Error analyzing results: ${error.message}`);
    }
  }

  analyzeDimensions(dimensionScores) {
    const analysis = {};
    const dimensions = ['E-I', 'S-N', 'T-F', 'J-P'];

    dimensions.forEach(dim => {
      const score = dimensionScores[dim];
      analysis[dim] = {
        score,
        strength: this.calculateStrength(score),
        description: this.getDimensionDescription(dim, score)
      };
    });

    return analysis;
  }

  analyzeResponsePatterns(answers) {
    const patterns = {
      responseTime: this.analyzeResponseTime(answers),
      consistency: this.analyzeConsistency(answers),
      confidence: this.analyzeConfidence(answers)
    };

    return patterns;
  }

  analyzeResponseTime(answers) {
    const times = answers.map(a => a.responseTime);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    
    return {
      average: avgTime,
      pattern: avgTime < 5 ? 'quick' : avgTime > 15 ? 'deliberate' : 'balanced'
    };
  }

  analyzeConsistency(answers) {
    const dimensionAnswers = {};
    answers.forEach(answer => {
      if (!dimensionAnswers[answer.dimension]) {
        dimensionAnswers[answer.dimension] = [];
      }
      dimensionAnswers[answer.dimension].push(answer.score);
    });

    const consistency = {};
    Object.entries(dimensionAnswers).forEach(([dim, scores]) => {
      const variance = this.calculateVariance(scores);
      consistency[dim] = {
        variance,
        level: variance < 0.5 ? 'high' : variance < 1 ? 'moderate' : 'low'
      };
    });

    return consistency;
  }

  analyzeConfidence(answers) {
    const confidenceLevels = answers.map(a => a.confidence);
    const avgConfidence = confidenceLevels.reduce((a, b) => a + b, 0) / confidenceLevels.length;
    
    return {
      average: avgConfidence,
      pattern: avgConfidence > 0.8 ? 'high' : avgConfidence > 0.5 ? 'moderate' : 'low'
    };
  }

  generateFeedback(dimensionAnalysis, responsePatterns) {
    const feedback = {
      strengths: [],
      areasForGrowth: [],
      recommendations: []
    };

    // Analyze dimension strengths
    Object.entries(dimensionAnalysis).forEach(([dim, analysis]) => {
      if (analysis.strength === 'strong') {
        feedback.strengths.push(analysis.description);
      } else if (analysis.strength === 'weak') {
        feedback.areasForGrowth.push(analysis.description);
      }
    });

    // Add response pattern insights
    if (responsePatterns.responseTime.pattern === 'quick') {
      feedback.recommendations.push('Consider taking more time to reflect on questions');
    } else if (responsePatterns.responseTime.pattern === 'deliberate') {
      feedback.recommendations.push('Your thoughtful approach is valuable, but try to trust your initial instincts more');
    }

    if (responsePatterns.confidence.pattern === 'low') {
      feedback.recommendations.push('Work on building confidence in your responses');
    }

    return feedback;
  }

  calculateStrength(score) {
    const absScore = Math.abs(score);
    if (absScore > 0.8) return 'strong';
    if (absScore > 0.5) return 'moderate';
    return 'weak';
  }

  calculateVariance(scores) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
  }

  getDimensionDescription(dimension, score) {
    const descriptions = {
      'E-I': {
        positive: 'You tend to be outgoing and energized by social interaction',
        negative: 'You tend to be introspective and energized by solitary activities'
      },
      'S-N': {
        positive: 'You tend to focus on concrete facts and details',
        negative: 'You tend to focus on patterns and possibilities'
      },
      'T-F': {
        positive: 'You tend to make decisions based on logic and objective analysis',
        negative: 'You tend to make decisions based on values and personal impact'
      },
      'J-P': {
        positive: 'You tend to prefer structure and planning',
        negative: 'You tend to prefer flexibility and spontaneity'
      }
    };

    return score > 0 ? descriptions[dimension].positive : descriptions[dimension].negative;
  }
}

export default new ResultAnalysisService(); 