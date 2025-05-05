import { useState } from 'react';
import Modal from '../ui/modal/Modal';
import Button from '../ui/button/Button';

interface Question {
  id: string;
  text: string;
  type: 'likert' | 'multiple-choice';
  options?: string[];
}

const PSYCH_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'I prefer working in teams rather than individually.',
    type: 'likert',
  },
  {
    id: 'q2',
    text: 'I handle stress well in high-pressure situations.',
    type: 'likert',
  },
  {
    id: 'q3',
    text: 'When faced with a problem, I typically:',
    type: 'multiple-choice',
    options: [
      'Analyze all possible solutions before acting',
      'Trust my instincts and act quickly',
      'Seek advice from others',
      'Look for similar past experiences',
    ],
  },
  // Add more questions as needed
];

interface PsychTestProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (answers: Record<string, any>) => Promise<void>;
  jobId: string;
}

export default function PsychologicalTest({
  isOpen,
  onClose,
  onSubmit,
  jobId,
}: PsychTestProps) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async () => {
    try {
      await onSubmit(answers);
      onClose();
    } catch (error) {
      setError('Failed to submit test. Please try again.');
    }
  };

  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case 'likert':
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium">{question.text}</p>
            <div className="flex justify-between gap-4">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => handleAnswer(question.id, value)}
                  className={`p-4 rounded-lg ${
                    answers[question.id] === value
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        );

      case 'multiple-choice':
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium">{question.text}</p>
            <div className="space-y-2">
              {question.options?.map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswer(question.id, option)}
                  className={`w-full p-3 text-left rounded-lg ${
                    answers[question.id] === option
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Psychological Assessment</h2>
        
        {error && (
          <div className="p-3 text-red-500 bg-red-100 rounded-lg">{error}</div>
        )}

        {renderQuestion(PSYCH_QUESTIONS[currentQuestion])}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          {currentQuestion < PSYCH_QUESTIONS.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion((prev) => prev + 1)}
              disabled={!answers[PSYCH_QUESTIONS[currentQuestion].id]}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!answers[PSYCH_QUESTIONS[currentQuestion].id]}
            >
              Submit
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
} 