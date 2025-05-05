import React from 'react';
import './StepsIndicator.css';

const StepsIndicator = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Personal Information' },
    { number: 2, label: 'Resume & Cover Letter' },
    { number: 3, label: 'Review & Submit' }
  ];

  return (
    <div className="steps-container">
      <div className="steps-progress">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className={`step ${currentStep >= step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}>
              <div className="step-number">
                {currentStep > step.number ? '✓' : step.number}
              </div>
              <div className="step-label">{step.label}</div>
            </div>
            {index < steps.length - 1 && (
              <div className={`step-line ${currentStep > step.number ? 'completed' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default StepsIndicator; 