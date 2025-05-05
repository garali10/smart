import Score from '../models/Score.js';
import Question from '../models/Question.js';

class RealTimeScoringService {
  constructor() {
    this.dimensionWeights = {
      'E-I': 1.0,
      'S-N': 1.0,
      'T-F': 1.0,
      'J-P': 1.0
    };
  }

  async calculateRealTimeScore(userId, testId, currentAnswers) {
    // Get all questions for the test
    const questions = await Question.find({ testId });
    
    // Calculate dimension scores
    const dimensionScores = this.calculateDimensionScores(currentAnswers, questions);
    
    // Calculate confidence scores for each dimension
    const confidenceScores = this.calculateConfidenceScores(currentAnswers, questions);
    
    // Calculate progress percentage
    const progress = this.calculateProgress(currentAnswers, questions);
    
    // Predict final MBTI type
    const predictedType = this.predictMBTIType(dimensionScores, confidenceScores);
    
    // Calculate real-time total score
    const totalScore = this.calculateTotalScore(dimensionScores, confidenceScores);

    return {
      dimensionScores,
      confidenceScores,
      progress,
      predictedType,
      totalScore,
      answers: currentAnswers
    };
  }

  calculateDimensionScores(answers, questions) {
    const dimensions = ['E-I', 'S-N', 'T-F', 'J-P'];
    const scores = {};

    dimensions.forEach(dim => {
      const dimensionAnswers = answers.filter(a => {
        const question = questions.find(q => q._id.toString() === a.questionId);
        return question && question.category === dim;
      });

      const totalScore = dimensionAnswers.reduce((sum, a) => {
        const question = questions.find(q => q._id.toString() === a.questionId);
        const weight = question ? question.weight : 1;
        return sum + (a.dimensionScore * weight);
      }, 0);

      scores[dim] = totalScore;
    });

    return scores;
  }

  calculateConfidenceScores(answers, questions) {
    const dimensions = ['E-I', 'S-N', 'T-F', 'J-P'];
    const confidence = {};

    dimensions.forEach(dim => {
      const dimensionAnswers = answers.filter(a => {
        const question = questions.find(q => q._id.toString() === a.questionId);
        return question && question.category === dim;
      });

      if (dimensionAnswers.length === 0) {
        confidence[dim] = 0;
        return;
      }

      // Calculate confidence based on:
      // 1. Number of answers in this dimension
      // 2. Consistency of answers
      // 3. Response time (if available)
      const consistency = this.calculateConsistency(dimensionAnswers);
      const completeness = dimensionAnswers.length / questions.filter(q => q.category === dim).length;
      
      confidence[dim] = (consistency + completeness) / 2;
    });

    return confidence;
  }

  calculateConsistency(answers) {
    if (answers.length < 2) return 0.5;

    // Calculate how consistent the answers are in terms of direction
    const positiveAnswers = answers.filter(a => a.dimensionScore > 0).length;
    const negativeAnswers = answers.filter(a => a.dimensionScore < 0).length;
    
    const consistency = Math.abs(positiveAnswers - negativeAnswers) / answers.length;
    return consistency;
  }

  calculateProgress(answers, questions) {
    const totalQuestions = questions.length;
    const answeredQuestions = answers.length;
    return (answeredQuestions / totalQuestions) * 100;
  }

  predictMBTIType(dimensionScores, confidenceScores) {
    let type = '';
    const dimensions = ['E-I', 'S-N', 'T-F', 'J-P'];

    dimensions.forEach(dim => {
      const score = dimensionScores[dim];
      const confidence = confidenceScores[dim];

      // Only predict if confidence is above threshold
      if (confidence > 0.3) {
        type += score > 0 ? dim[0] : dim[2];
      } else {
        type += '?'; // Indicate uncertainty
      }
    });

    return type;
  }

  calculateTotalScore(dimensionScores, confidenceScores) {
    const dimensions = ['E-I', 'S-N', 'T-F', 'J-P'];
    let totalScore = 0;
    let totalWeight = 0;

    dimensions.forEach(dim => {
      const score = Math.abs(dimensionScores[dim]);
      const confidence = confidenceScores[dim];
      const weight = this.dimensionWeights[dim];

      totalScore += score * confidence * weight;
      totalWeight += weight;
    });

    // Normalize to 0-100 range
    return Math.round((totalScore / totalWeight) * 100);
  }

  async updateRealTimeScore(userId, testId, scoreData) {
    // Update or create real-time score document
    const score = await Score.findOneAndUpdate(
      { userId, testId, status: 'in_progress' },
      {
        $set: {
          dimensionScores: scoreData.dimensionScores,
          confidenceScores: scoreData.confidenceScores,
          progress: scoreData.progress,
          predictedType: scoreData.predictedType,
          totalScore: scoreData.totalScore,
          answers: scoreData.answers,
          lastUpdated: new Date()
        }
      },
      { upsert: true, new: true }
    );

    return score;
  }
}

export default new RealTimeScoringService(); 