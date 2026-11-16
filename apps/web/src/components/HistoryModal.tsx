import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

export const HistoryModal: React.FC = () => {
  const { showHistory, setShowHistory, historyLogs } = useStore();

  const getTagIcon = (type: string) => {
    switch (type) {
      case 'cut': return '💥 CUT';
      case 'pickup': return '📥 PICKUP';
      case 'win': return '🏆 WIN';
      case 'out': return '🎉 OUT';
      default: return '🂠 PLAY';
    }
  };

  return (
    <AnimatePresence>
      {showHistory && (
        <div className="modal-backdrop-luxury" onClick={() => setShowHistory(false)}>
          <motion.div
            className="history-drawer-panel"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="history-drawer-header">
              <div className="drawer-title-box">
                <span className="drawer-icon">📜</span>
                <h3>GAME HISTORY LOG</h3>
                <span className="log-count-pill">{historyLogs.length} events</span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowHistory(false)}>
                ✕
              </button>
            </div>

            <div className="history-drawer-body">
              {historyLogs.length === 0 ? (
                <div className="drawer-empty-state">
                  <span className="empty-state-icon">🂠</span>
                  <p>No plays recorded yet.</p>
                  <span className="empty-state-sub">Events will appear here as tricks are played.</span>
                </div>
              ) : (
                <div className="history-timeline">
                  {historyLogs.map(log => (
                    <div key={log.id} className={`timeline-entry entry-${log.type}`}>
                      <div className="timeline-header">
                        <span className={`timeline-tag tag-${log.type}`}>
                          {getTagIcon(log.type)}
                        </span>
                        <span className="timeline-trick">Trick #{log.trickNumber}</span>
                        <span className="timeline-time">{log.timestamp}</span>
                      </div>
                      <div className="timeline-detail">{log.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="history-drawer-footer">
              <button className="btn-silver-action btn-sm" onClick={() => setShowHistory(false)}>
                Close Log
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
