import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ duration: 0.2 }}
            onClick={() => removeToast(toast.id)}
          >
            <span>{toast.message}</span>
            <button className="toast-close">✕</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
