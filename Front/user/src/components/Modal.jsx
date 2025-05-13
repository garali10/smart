import React from 'react';
import './Modal.css';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button 
          className="modal-close" 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#ffffff',
            border: '1px solid #800000',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#800000',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f8d7da';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal; 