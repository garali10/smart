import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, size = 'md', title }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        ></div>

        <div
          className={`relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all dark:bg-boxdark sm:my-8 sm:w-full sm:p-6 ${sizeClasses[size]}`}
        >
          {title && (
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal; 