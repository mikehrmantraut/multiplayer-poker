import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { GameToast } from '@/state/types';

interface ToastProps {
  toast: GameToast;
  onRemove: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div 
      className={clsx(
        'toast',
        `toast-${toast.type}`,
        'animate-in slide-in-from-right-full duration-300'
      )}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 pt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">
            {toast.title}
          </div>
          <div className="text-sm text-gray-300 mt-1">
            {toast.message}
          </div>
        </div>

        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: GameToast[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast 
          key={toast.id} 
          toast={toast} 
          onRemove={onRemove} 
        />
      ))}
    </div>
  );
};

export default Toast;
