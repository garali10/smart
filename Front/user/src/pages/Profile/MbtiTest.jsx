import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './MbtiTest.css';

const MbtiTest = () => {
  console.log("MBTI Test component rendering");
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnToJobId = searchParams.get('returnToJob');
  
  // State variables for test session
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [testCompleted, setTestCompleted] = useState(false);
  const [results, setResults] = useState(null);
  const [debug, setDebug] = useState({});
  const [apiHealth, setApiHealth] = useState(null);
  
  // Check if we should redirect back to job application
  const shouldReturnToJob = localStorage.getItem('returnToApplication') === 'true';
  const adjustedReturnToJobId = returnToJobId || (shouldReturnToJob ? localStorage.getItem('pendingJobId') : null);
  
  // Add function to handle returning to job application
  const handleReturnToJob = () => {
    // Store the step in localStorage so the form can pick it up
    localStorage.setItem('currentJobApplicationStep', '2');
    
    // Add a flag to automatically open the application popup/modal
    localStorage.setItem('autoOpenJobApplication', 'true');
    
    // Navigate to the portfolio section as requested
    window.location.href = "http://localhost:3000/#portfolio";
  };

  useEffect(() => {
    console.log("MBTI Test useEffect running");
    
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    // Check if this is part of a job application flow
    if (returnToJobId) {
      console.log("MBTI test initiated as part of job application for job:", returnToJobId);
    }
    
    // First check API health to diagnose potential issues
    const checkApiHealth = async () => {
      try {
        console.log("Checking API health...");
        const healthResponse = await axios.get('http://localhost:5001/api/tests/health');
        console.log("API Health response:", healthResponse.data);
        setApiHealth({
          status: 'success',
          data: healthResponse.data
        });
        return true;
      } catch (err) {
        console.error("API Health check failed:", err);
        setApiHealth({
          status: 'error',
          error: err
        });
        return false;
      }
    };

    const fetchQuestionsAndStartSession = async () => {
      try {
        setLoading(true);
        
        // First check API health
        const isHealthy = await checkApiHealth();
        if (!isHealthy) {
          setError('API Health check failed. The test API might be unavailable.');
          setLoading(false);
          return;
        }
        
        console.log("Fetching questions and starting session...");
        
        // Fetch MBTI questions
        const questionsResponse = await axios.get('http://localhost:5001/api/tests/questions', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        console.log("Questions response:", questionsResponse.data);
        
        if (questionsResponse.data.success && questionsResponse.data.questions) {
          setQuestions(questionsResponse.data.questions);
          
          // Start a new test session
          const sessionResponse = await axios.post('http://localhost:5001/api/tests/start', {}, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          console.log("Session response:", sessionResponse.data);
          
          if (sessionResponse.data.success && sessionResponse.data.sessionId) {
            setSessionId(sessionResponse.data.sessionId);
            setError(null);
          } else {
            setError('Failed to start test session. Please try again.');
          }
        } else {
          setError('Failed to fetch MBTI questions. Please try again.');
        }
      } catch (err) {
        console.error('Error setting up MBTI test:', err);
        setError(err.response?.data?.message || 'Failed to set up MBTI test. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestionsAndStartSession();
  }, [isAuthenticated, navigate, returnToJobId]);

  const handleAnswer = async (answer, dimension, value) => {
    if (submitting || !sessionId) return;
    
    try {
      setSubmitting(true);
      console.log(`Submitting answer: ${answer}, dimension: ${dimension}, value: ${value}`);
      
      const payload = {
        sessionId,
        questionId: questions[currentQuestionIndex]?._id || `question_${currentQuestionIndex + 1}`,
        answer,
        dimension,
        value: Number(value) // Ensure value is a number
      };
      
      console.log("Answer payload:", payload);
      
      const response = await axios.post('http://localhost:5001/api/tests/answer', payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log("Answer response:", response.data);
      
      if (response.data.success) {
        setProgress(response.data.progress || 0);
        
        // If test is completed
        if (response.data.status === 'completed') {
          setTestCompleted(true);
          setResults(response.data.result);
          console.log("Test completed with results:", response.data.result);
        } else if (currentQuestionIndex < questions.length - 1) {
          // Move to next question
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
          // End of questions
          setTestCompleted(true);
        }
      } else {
        setError('Failed to submit answer. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      
      // More detailed error information
      if (err.response) {
        // The server responded with a status code outside the 2xx range
        console.error('Server response:', err.response.data);
        setError(err.response.data?.message || 
                `Server error (${err.response.status}): ${err.response.data?.error || 'Unknown error'}`);
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received:', err.request);
        setError('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request
        setError('Failed to submit answer: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionOption = (option, index) => {
    return (
      <button
        key={index}
        className="mbti-option"
        onClick={() => handleAnswer(option.text, option.dimension, option.value)}
        disabled={submitting}
      >
        {option.text}
      </button>
    );
  };

  const renderCurrentQuestion = () => {
    const question = questions[currentQuestionIndex];
    if (!question) return null;

    return (
      <div className="mbti-question">
        <h3>{question.text}</h3>
        <div className="mbti-options">
          {question.options.map((option, index) => renderQuestionOption(option, index))}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    const { personalityType, dimensionScores } = results;
    
    // MBTI type descriptions
    const typeDescriptions = {
      'INTJ': 'The Architect: Strategic, independent, and analytical thinker with a vision for improvement.',
      'INTP': 'The Logician: Innovative problem solver with a thirst for knowledge and logical analysis.',
      'ENTJ': 'The Commander: Decisive leader who drives efficiency and achievement through strategic planning.',
      'ENTP': 'The Debater: Quick-thinking innovator who enjoys intellectual challenges and creative brainstorming.',
      'INFJ': 'The Advocate: Idealistic, principled, and committed to helping others reach their potential.',
      'INFP': 'The Mediator: Creative, compassionate idealist with deep personal values and empathy.',
      'ENFJ': 'The Protagonist: Charismatic leader focused on growth, inspiration, and bringing out the best in others.',
      'ENFP': 'The Campaigner: Enthusiastic, creative connector who sees possibilities in people and situations.',
      'ISTJ': 'The Logistician: Practical, detail-oriented, and reliable with a strong sense of duty.',
      'ISFJ': 'The Defender: Loyal, compassionate protector who values tradition and care for others.',
      'ESTJ': 'The Executive: Efficient organizer who implements practical systems and upholds traditions.',
      'ESFJ': 'The Consul: Caring, social connector focused on harmony and meeting others\' needs.',
      'ISTP': 'The Virtuoso: Practical problem-solver with mechanical aptitude and adaptability.',
      'ISFP': 'The Adventurer: Sensitive artist with a strong aesthetic sense and desire for personal freedom.',
      'ESTP': 'The Entrepreneur: Action-oriented risk-taker who excels in dynamic situations.',
      'ESFP': 'The Entertainer: Spontaneous enthusiast who brings fun, engagement, and practical help to others.'
    };
    
    return (
      <div className="mbti-results">
        <h2>Your MBTI Test Results</h2>
        <div className="mbti-type">
          <h3>Your Type: {personalityType}</h3>
          <p className="type-description">{typeDescriptions[personalityType] || 'A unique blend of psychological preferences and cognitive functions.'}</p>
        </div>
        
        <div className="dimension-scores">
          <h3>Dimension Scores:</h3>
          <div className="score-container">
            <div className="dimension">
              <span className={dimensionScores['E-I'] > 0 ? 'highlighted' : ''}>Extraverted (E)</span>
              <div className="score-bar">
                <div className="bar left" style={{ width: `${dimensionScores['E-I'] > 0 ? Math.abs(dimensionScores['E-I']) * 10 : 0}%` }}></div>
                <div className="bar right" style={{ width: `${dimensionScores['E-I'] < 0 ? Math.abs(dimensionScores['E-I']) * 10 : 0}%` }}></div>
              </div>
              <span className={dimensionScores['E-I'] < 0 ? 'highlighted' : ''}>Introverted (I)</span>
            </div>
            
            <div className="dimension">
              <span className={dimensionScores['S-N'] > 0 ? 'highlighted' : ''}>Sensing (S)</span>
              <div className="score-bar">
                <div className="bar left" style={{ width: `${dimensionScores['S-N'] > 0 ? Math.abs(dimensionScores['S-N']) * 10 : 0}%` }}></div>
                <div className="bar right" style={{ width: `${dimensionScores['S-N'] < 0 ? Math.abs(dimensionScores['S-N']) * 10 : 0}%` }}></div>
              </div>
              <span className={dimensionScores['S-N'] < 0 ? 'highlighted' : ''}>Intuitive (N)</span>
            </div>
            
            <div className="dimension">
              <span className={dimensionScores['T-F'] > 0 ? 'highlighted' : ''}>Thinking (T)</span>
              <div className="score-bar">
                <div className="bar left" style={{ width: `${dimensionScores['T-F'] > 0 ? Math.abs(dimensionScores['T-F']) * 10 : 0}%` }}></div>
                <div className="bar right" style={{ width: `${dimensionScores['T-F'] < 0 ? Math.abs(dimensionScores['T-F']) * 10 : 0}%` }}></div>
              </div>
              <span className={dimensionScores['T-F'] < 0 ? 'highlighted' : ''}>Feeling (F)</span>
            </div>
            
            <div className="dimension">
              <span className={dimensionScores['J-P'] > 0 ? 'highlighted' : ''}>Judging (J)</span>
              <div className="score-bar">
                <div className="bar left" style={{ width: `${dimensionScores['J-P'] > 0 ? Math.abs(dimensionScores['J-P']) * 10 : 0}%` }}></div>
                <div className="bar right" style={{ width: `${dimensionScores['J-P'] < 0 ? Math.abs(dimensionScores['J-P']) * 10 : 0}%` }}></div>
              </div>
              <span className={dimensionScores['J-P'] < 0 ? 'highlighted' : ''}>Perceiving (P)</span>
            </div>
          </div>
        </div>
        
        <div className="test-actions">
          {returnToJobId ? (
            <button 
              className="apply-job-btn"
              onClick={handleReturnToJob}
            >
              Continue with Job Application
            </button>
          ) : (
            <button 
              className="return-btn"
              onClick={() => navigate('/profile')}
            >
              Return to Profile
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mbti-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading MBTI test...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mbti-container">
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          
          {apiHealth && (
            <div className="api-health-info">
              <h4>API Health Diagnostics:</h4>
              <pre>{JSON.stringify(apiHealth, null, 2)}</pre>
            </div>
          )}
          
          <button onClick={() => window.location.reload()} className="retry-btn">
            Try Again
          </button>
          <button onClick={() => navigate('/profile')} className="retry-btn">
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mbti-container">
      <div className="mbti-header">
        <h1>MBTI Personality Test</h1>
        {!testCompleted && (
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="progress-text">{progress}% Complete</span>
          </div>
        )}
      </div>
      
      <div className="mbti-content">
        {testCompleted ? renderResults() : renderCurrentQuestion()}
      </div>
    </div>
  );
};

export default MbtiTest; 