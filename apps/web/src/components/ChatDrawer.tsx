import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { socket } from '../socket';

const QUICK_ACTIONS = [
  { label: '📜 Rules', text: '/rules' },
  { label: '🃏 Card Counts', text: '/cards' },
  { label: '💡 Turn Hint', text: '/hint' },
  { label: '⚡ What is Thoko?', text: '/cut' },
  { label: '👑 Who has A♠?', text: 'who has ace of spades?' },
];

const QUICK_REACTIONS = [
  '🔥 Thoko!',
  '😂 Bhabhi bano ge!',
  '👏 Shabash!',
  '⚡ Jaldi chalo!',
  '👑 Kismat achhi hai!',
  '🙏 Namaste Pandit Ji',
];

export const ChatDrawer: React.FC = () => {
  const { showChat, setShowChat, chatMessages, roomState } = useStore();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showChat, chatMessages]);

  if (!showChat) return null;

  const handleSend = (textToSend?: string) => {
    const raw = (textToSend ?? inputText).trim();
    if (!raw) return;

    socket.emit('chat:send', { text: raw });
    if (!textToSend) {
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      <div className="chat-modal-backdrop" onClick={() => setShowChat(false)}>
        <motion.div
          className="chat-drawer-container"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <header className="chat-drawer-header">
            <div className="chat-header-title-box">
              <span className="chat-dealer-icon">🤖</span>
              <div>
                <h3 className="chat-title">Table Chat & AI Dealer</h3>
                <span className="chat-subtitle">
                  Room: {roomState?.code} · Ask rules, counts, or talk to room
                </span>
              </div>
            </div>
            <button
              className="chat-close-btn"
              onClick={() => setShowChat(false)}
              aria-label="Close Chat"
            >
              ✕
            </button>
          </header>

          {/* Quick AI Dealer Questions */}
          <div className="chat-quick-actions-bar">
            <span className="quick-action-title">ASK DEALER:</span>
            <div className="quick-action-chips">
              {QUICK_ACTIONS.map((action, idx) => (
                <button
                  key={idx}
                  className="quick-chip-btn"
                  onClick={() => handleSend(action.text)}
                  title={`Ask ${action.label}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Stream */}
          <div className="chat-messages-stream">
            {chatMessages.length === 0 ? (
              <div className="chat-empty-hint">
                <span className="empty-icon">💬</span>
                <p>Welcome! Ask the AI Dealer any rule, or send a message to all players.</p>
              </div>
            ) : (
              chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`chat-message-row ${msg.isDealer ? 'dealer-row' : 'player-row'}`}
                >
                  <div className="chat-message-bubble">
                    <div className="chat-sender-line">
                      {msg.isDealer ? (
                        <span className="dealer-badge">★ BHABHI DEALER BOT</span>
                      ) : (
                        <span className="player-sender-tag">
                          {msg.sender} {msg.seat >= 0 ? `(Seat ${msg.seat + 1})` : ''}
                        </span>
                      )}
                      <span className="chat-timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="chat-text-body">{msg.text}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reactions Bar */}
          <div className="chat-reactions-strip">
            {QUICK_REACTIONS.map((emojiText, idx) => (
              <button
                key={idx}
                type="button"
                className="reaction-pill"
                onClick={() => handleSend(emojiText)}
              >
                {emojiText}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <footer className="chat-input-dock">
            <input
              type="text"
              className="chat-text-field"
              placeholder="Type message or ask Dealer (e.g. /cards)..."
              value={inputText}
              maxLength={200}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="chat-send-btn"
              disabled={!inputText.trim()}
              onClick={() => handleSend()}
            >
              <span>Send</span>
              <span>✦</span>
            </button>
          </footer>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
