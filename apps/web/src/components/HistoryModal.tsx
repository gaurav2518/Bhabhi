import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

export const HistoryModal: React.FC = () => {
  const { showHistory, setShowHistory, historyLogs } = useStore();

  return (
    <AnimatePresence>
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <motion.div
            className="modal-card history-modal"
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>📜 Game History Log</h2>
              <button className="btn-close" onClick={() => setShowHistory(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body history-body">
              {historyLogs.length === 0 ? (
                <div className="history-empty">No events recorded yet. Plays will appear here as the game progresses.</div>
              ) : (
                <div className="history-list">
                  {historyLogs.map(log => (
                    <div key={log.id} className={`history-item history-item-${log.type}`}>
                      <div className="history-item-header">
                        <span className="history-trick">Trick #{log.trickNumber}</span>
                        <span className="history-time">{log.timestamp}</span>
                      </div>
                      <div className="history-item-text">{log.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowHistory(false)}>
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
