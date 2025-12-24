import { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import './Toast.css';

const ToastContext = createContext(null);

const TOAST_TYPES = {
  success: { icon: CheckCircle, className: 'toast--success' },
  error: { icon: AlertCircle, className: 'toast--error' },
  warning: { icon: AlertTriangle, className: 'toast--warning' },
  info: { icon: Info, className: 'toast--info' }
};

const TOAST_DURATION = 4000;

function Toast({ id, type, message, onDismiss }) {
  const { icon: Icon, className } = TOAST_TYPES[type] || TOAST_TYPES.info;

  return (
    <div className={`toast ${className}`} role="alert" aria-live="polite">
      <Icon size={20} className="toast__icon" aria-hidden="true" />
      <span className="toast__message">{message}</span>
      <button 
        className="toast__dismiss" 
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="toast-container" aria-label="Notifications">
      {toasts.map(toast => (
        <Toast 
          key={toast.id} 
          {...toast} 
          onDismiss={onDismiss} 
        />
      ))}
    </div>,
    document.body
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, duration = TOAST_DURATION) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setToasts(prev => [...prev, { id, type, message }]);
    
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    
    return id;
  }, [dismiss]);

  const toast = {
    success: (message, duration) => addToast('success', message, duration),
    error: (message, duration) => addToast('error', message, duration),
    warning: (message, duration) => addToast('warning', message, duration),
    info: (message, duration) => addToast('info', message, duration),
    dismiss
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
