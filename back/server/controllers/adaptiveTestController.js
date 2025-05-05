import adaptiveQuestionService from '../services/adaptiveQuestionService.js';
import Question from '../models/Question.js';
import Score from '../models/Score.js';

class AdaptiveTestController {
  async startTest(req, res) {
    try {
      const { testId } = req.params;
      const userId = req.user._id;

      // Get the first question
      const firstQuestion = await adaptiveQuestionService.getNextQuestion(userId, testId);
      
      if (!firstQuestion) {
        return res.status(404).json({ message: 'No questions available for this test' });
      }

      res.json({
        question: firstQuestion,
        testStarted: true
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async submitAnswer(req, res) {
    try {
      const { testId, questionId } = req.params;
      const { answer, responseTime } = req.body;
      const userId = req.user._id;

      // Get the current question
      const currentQuestion = await Question.findById(questionId);
      if (!currentQuestion) {
        return res.status(404).json({ message: 'Question not found' });
      }

      // Determine if the answer is correct and calculate dimension score
      const { isCorrect, dimensionScore } = this.evaluateMBTIAnswer(currentQuestion, answer);

      // Update question metrics
      await adaptiveQuestionService.updateQuestionMetrics(
        questionId,
        isCorrect,
        responseTime
      );

      // Adjust question difficulty if needed
      await adaptiveQuestionService.adjustQuestionDifficulty(questionId);

      // Get the next question
      const nextQuestion = await adaptiveQuestionService.getNextQuestion(
        userId,
        testId,
        [{ questionId, isCorrect, dimensionScore }]
      );

      // If no more questions, calculate final score
      if (!nextQuestion) {
        const finalScore = await this.calculateFinalMBTIScore(userId, testId);
        return res.json({
          testCompleted: true,
          finalScore
        });
      }

      res.json({
        isCorrect,
        dimensionScore,
        nextQuestion
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  evaluateMBTIAnswer(question, answer) {
    // For MBTI, we need to evaluate based on the dimension and value
    const selectedOption = question.options.find(opt => 
      opt.text === answer || opt.value === answer
    );

    if (!selectedOption) {
      return { isCorrect: false, dimensionScore: 0 };
    }

    // Calculate dimension score based on the selected value
    // For MBTI, values typically range from -3 to +3
    const dimensionScore = selectedOption.value;

    // For MBTI, there's no "correct" answer, but we can validate if the answer is within expected range
    const isCorrect = Math.abs(dimensionScore) <= 3;

    return {
      isCorrect,
      dimensionScore,
      dimension: selectedOption.dimension
    };
  }

  async calculateFinalMBTIScore(userId, testId) {
    // Get all answers for this test
    const answers = await this.getTestAnswers(userId, testId);

    // Calculate scores for each MBTI dimension
    const dimensionScores = this.calculateDimensionScores(answers);

    // Determine final MBTI type
    const mbtiType = this.determineMBTIType(dimensionScores);

    // Create and save the score
    const score = new Score({
      userId,
      testId,
      dimensionScores,
      finalMBTIType: mbtiType,
      totalScore: this.calculateTotalScore(dimensionScores),
      answers: answers.map(a => ({
        questionId: a.questionId,
        selectedOption: a.answer,
        dimension: a.dimension,
        score: a.dimensionScore
      }))
    });

    await score.save();
    return score;
  }

  calculateDimensionScores(answers) {
    const dimensions = ['E-I', 'S-N', 'T-F', 'J-P'];
    const scores = {};

    dimensions.forEach(dim => {
      const dimensionAnswers = answers.filter(a => a.dimension === dim);
      const totalScore = dimensionAnswers.reduce((sum, a) => sum + a.dimensionScore, 0);
      scores[dim] = totalScore;
    });

    return scores;
  }

  determineMBTIType(dimensionScores) {
    let mbtiType = '';

    // E-I dimension
    mbtiType += dimensionScores['E-I'] > 0 ? 'E' : 'I';
    
    // S-N dimension
    mbtiType += dimensionScores['S-N'] > 0 ? 'S' : 'N';
    
    // T-F dimension
    mbtiType += dimensionScores['T-F'] > 0 ? 'T' : 'F';
    
    // J-P dimension
    mbtiType += dimensionScores['J-P'] > 0 ? 'J' : 'P';

    return mbtiType;
  }

  calculateTotalScore(dimensionScores) {
    // Calculate a normalized total score (0-100)
    const maxPossibleScore = 3 * 4; // 3 points per dimension * 4 dimensions
    const totalRawScore = Object.values(dimensionScores).reduce((sum, score) => sum + Math.abs(score), 0);
    return Math.round((totalRawScore / maxPossibleScore) * 100);
  }

  async getTestAnswers(userId, testId) {
    // This would typically query your database for all answers
    // for this user and test combination
    // For now, we'll return an empty array
    return [];
  }
}

export default new AdaptiveTestController(); 