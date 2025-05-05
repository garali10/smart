import React from 'react';

const MbtiTestSimple = () => {
  return (
    <div style={{ 
      maxWidth: '800px',
      margin: '50px auto',
      padding: '30px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      textAlign: 'center'
    }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>MBTI Personality Test</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <p style={{ fontSize: '18px', lineHeight: '1.6', color: '#555' }}>
          This is a simplified version of the MBTI test component.
        </p>
        <p style={{ fontSize: '16px', color: '#666', marginTop: '10px' }}>
          If you can see this page, the routing is working correctly.
        </p>
      </div>
      
      <div style={{ marginTop: '40px' }}>
        <button 
          style={{
            padding: '12px 25px',
            backgroundColor: '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default MbtiTestSimple; 