import './ErrorMessage.css';

const ErrorMessage = ({ message }) => (
  <div className="error-message">
    <p>{message || 'An error occurred. Please try again.'}</p>
  </div>
);

export default ErrorMessage; 