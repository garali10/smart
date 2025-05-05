import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProfileCard.css';

const MbtiResultsCard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mbtiData, setMbtiData] = useState(null);

  useEffect(() => {
    const fetchMbtiResults = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('No authentication token found');
        }
        
        const response = await axios.get('http://localhost:5001/api/tests/status/user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('MBTI test status response:', response.data);
        
        if (response.data && response.data.status === 'completed') {
          setMbtiData({
            type: response.data.result?.personalityType || response.data.result,
            dimensionScores: response.data.result?.dimensionScores || {},
            status: response.data.status
          });
        } else {
          setMbtiData({
            status: response.data.status || 'not_started'
          });
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching MBTI results:', err);
        setError('Failed to load MBTI results');
        setMbtiData({ status: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchMbtiResults();
  }, []);

  const getPersonalityDescription = (type) => {
    const descriptions = {
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
    
    return descriptions[type] || 'A unique personality type combining various psychological preferences and traits.';
  };

  if (loading) {
    return (
      <div className="mbti-card">
        <h3>MBTI Personality Test</h3>
        <div className="loading-indicator">Loading your results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mbti-card error">
        <h3>MBTI Personality Test</h3>
        <p>{error}</p>
        <button className="btn btn--purple" onClick={() => navigate('/mbti-test')}>
          Try Again
        </button>
      </div>
    );
  }

  if (!mbtiData || mbtiData.status !== 'completed') {
    return (
      <div className="mbti-card not-taken">
        <h3>MBTI Personality Test</h3>
        <p>You haven't completed the MBTI personality test yet.</p>
        <p>Taking this test will help you find jobs that match your personality type!</p>
        <button className="btn btn--purple" onClick={() => navigate('/mbti-test')}>
          Take the Test
        </button>
      </div>
    );
  }

  // Render the results if test is completed
  return (
    <div className="mbti-card completed">
      <h3>Your MBTI Personality Type</h3>
      
      <div className="mbti-type-result">
        <div className="type-badge">{mbtiData.type}</div>
        <p className="type-description">{getPersonalityDescription(mbtiData.type)}</p>
      </div>
      
      {mbtiData.dimensionScores && (
        <div className="dimension-scores">
          <div className="dimension">
            <span className={mbtiData.dimensionScores['E-I'] > 0 ? 'highlighted' : ''}>E</span>
            <div className="score-bar">
              <div className="bar left" style={{ width: `${mbtiData.dimensionScores['E-I'] > 0 ? Math.abs(mbtiData.dimensionScores['E-I']) * 10 : 0}%` }}></div>
              <div className="bar right" style={{ width: `${mbtiData.dimensionScores['E-I'] < 0 ? Math.abs(mbtiData.dimensionScores['E-I']) * 10 : 0}%` }}></div>
            </div>
            <span className={mbtiData.dimensionScores['E-I'] < 0 ? 'highlighted' : ''}>I</span>
          </div>
          
          <div className="dimension">
            <span className={mbtiData.dimensionScores['S-N'] > 0 ? 'highlighted' : ''}>S</span>
            <div className="score-bar">
              <div className="bar left" style={{ width: `${mbtiData.dimensionScores['S-N'] > 0 ? Math.abs(mbtiData.dimensionScores['S-N']) * 10 : 0}%` }}></div>
              <div className="bar right" style={{ width: `${mbtiData.dimensionScores['S-N'] < 0 ? Math.abs(mbtiData.dimensionScores['S-N']) * 10 : 0}%` }}></div>
            </div>
            <span className={mbtiData.dimensionScores['S-N'] < 0 ? 'highlighted' : ''}>N</span>
          </div>
          
          <div className="dimension">
            <span className={mbtiData.dimensionScores['T-F'] > 0 ? 'highlighted' : ''}>T</span>
            <div className="score-bar">
              <div className="bar left" style={{ width: `${mbtiData.dimensionScores['T-F'] > 0 ? Math.abs(mbtiData.dimensionScores['T-F']) * 10 : 0}%` }}></div>
              <div className="bar right" style={{ width: `${mbtiData.dimensionScores['T-F'] < 0 ? Math.abs(mbtiData.dimensionScores['T-F']) * 10 : 0}%` }}></div>
            </div>
            <span className={mbtiData.dimensionScores['T-F'] < 0 ? 'highlighted' : ''}>F</span>
          </div>
          
          <div className="dimension">
            <span className={mbtiData.dimensionScores['J-P'] > 0 ? 'highlighted' : ''}>J</span>
            <div className="score-bar">
              <div className="bar left" style={{ width: `${mbtiData.dimensionScores['J-P'] > 0 ? Math.abs(mbtiData.dimensionScores['J-P']) * 10 : 0}%` }}></div>
              <div className="bar right" style={{ width: `${mbtiData.dimensionScores['J-P'] < 0 ? Math.abs(mbtiData.dimensionScores['J-P']) * 10 : 0}%` }}></div>
            </div>
            <span className={mbtiData.dimensionScores['J-P'] < 0 ? 'highlighted' : ''}>P</span>
          </div>
        </div>
      )}
      
      <button className="btn btn--outline-purple" onClick={() => navigate('/mbti-test')}>
        View Detailed Results
      </button>
    </div>
  );
};

export default MbtiResultsCard; 