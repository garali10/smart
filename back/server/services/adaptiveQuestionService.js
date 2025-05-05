import Question from '../models/Question.js';

class AdaptiveQuestionService {
  constructor() {
    this.difficultyThresholds = {
      easy: 0.7,    // 70% correct answers to move up
      medium: 0.5,  // 50% correct answers to maintain
      hard: 0.3     // 30% correct answers to move down
    };
  }

  async getNextQuestion(userId, testId, previousAnswers = []) {
    // Calculate user's current performance
    const performance = this.calculatePerformance(previousAnswers);
    
    // Determine target difficulty based on performance
    const targetDifficulty = this.determineTargetDifficulty(performance);
    
    // Get questions matching the target difficulty
    const questions = await this.getQuestionsByDifficulty(testId, targetDifficulty);
    
    // Select the most appropriate question
    return this.selectOptimalQuestion(questions, previousAnswers);
  }

  calculatePerformance(previousAnswers) {
    if (previousAnswers.length === 0) return 1; // Start with easy questions

    const correctAnswers = previousAnswers.filter(answer => answer.isCorrect).length;
    const totalAnswers = previousAnswers.length;
    
    return correctAnswers / totalAnswers;
  }

  determineTargetDifficulty(performance) {
    if (performance >= this.difficultyThresholds.easy) return 3; // Move to hard
    if (performance >= this.difficultyThresholds.medium) return 2; // Stay at medium
    return 1; // Move to easy
  }

  async getQuestionsByDifficulty(testId, difficulty) {
    return await Question.find({
      testId,
      difficulty,
      isActive: true
    });
  }

  selectOptimalQuestion(questions, previousAnswers) {
    if (questions.length === 0) return null;

    // Get categories of previously answered questions
    const answeredCategories = new Set(
      previousAnswers.map(answer => answer.category)
    );

    // Find questions from categories that haven't been asked yet
    const unaskedQuestions = questions.filter(
      question => !answeredCategories.has(question.category)
    );

    // If we have unasked questions, return one randomly
    if (unaskedQuestions.length > 0) {
      return unaskedQuestions[
        Math.floor(Math.random() * unaskedQuestions.length)
      ];
    }

    // If all categories have been asked, return a random question
    return questions[Math.floor(Math.random() * questions.length)];
  }

  async updateQuestionMetrics(questionId, isCorrect, responseTime) {
    const question = await Question.findById(questionId);
    if (!question) return;

    const metrics = question.performanceMetrics;
    metrics.totalAttempts += 1;
    if (isCorrect) metrics.correctAttempts += 1;
    
    // Update average response time
    metrics.averageResponseTime = 
      (metrics.averageResponseTime * (metrics.totalAttempts - 1) + responseTime) / 
      metrics.totalAttempts;

    await question.save();
  }

  async adjustQuestionDifficulty(questionId) {
    const question = await Question.findById(questionId);
    if (!question) return;

    const metrics = question.performanceMetrics;
    const successRate = metrics.correctAttempts / metrics.totalAttempts;

    // Adjust difficulty based on success rate
    if (successRate > 0.8 && question.difficulty < 3) {
      question.difficulty += 1;
    } else if (successRate < 0.3 && question.difficulty > 1) {
      question.difficulty -= 1;
    }

    await question.save();
  }
}

export default new AdaptiveQuestionService(); 