import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { socket } from '../socket';
import { useStore } from '../store';

export const HomeScreen: React.FC = () => {
  const { playerName, setPlayerName, setSession, setError, setShowRules } = useStore();
  const [nameInput, setNameInput] = useState(playerName || '');
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    const finalName = nameInput.trim() || 'Player 1';
    setPlayerName(finalName);
    setLoading(true);
    setError(null);

    socket.connect();
    socket.emit('room:create', { name: finalName }, (res: any) => {
      setLoading(false);
      if (res && res.ok) {
        setSession(res.code, res.token, res.seat);
      } else {
        setError(res?.error || 'Failed to create room');
      }
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = nameInput.trim() || 'Player';
    const code = codeInput.trim().toUpperCase();

    if (!code) {
      setError('Please enter a 5-character room code');
      return;
    }

    setPlayerName(finalName);
    setLoading(true);
    setError(null);

    socket.connect();
    socket.emit('room:join', { code, name: finalName }, (res: any) => {
      setLoading(false);
      if (res && res.ok) {
        setSession(res.code, res.token, res.seat);
      } else {
        setError(res?.error || 'Failed to join room');
      }
    });
  };

  return (
    <div className="landing-viewport">
      {/* Background Decorative Ambient Elements */}
      <div className="landing-ambient-glow" />
      <div className="suit-watermark suit-spade">♠</div>
      <div className="suit-watermark suit-heart">♥</div>
      <div className="suit-watermark suit-club">♣</div>
      <div className="suit-watermark suit-diamond">♦</div>

      <motion.div
        className="landing-portal-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Crest & Title Header */}
        <div className="landing-crest">
          <div className="crest-emblem">
            <span className="crest-crown">👑</span>
            <span className="crest-card-pip">♠</span>
          </div>
          <h1 className="landing-brand-title">BHABHI</h1>
          <p className="landing-brand-subtitle">THE CLASSIC INDIAN CARD GAME</p>
        </div>

        {/* Feature Pills */}
        <div className="landing-tags-row">
          <span className="tag-chip">♠ 2–8 Players</span>
          <span className="tag-chip">⚡ Real-time Multi</span>
          <span className="tag-chip">🤖 Smart Bots</span>
        </div>

        {/* Name Input */}
        <div className="form-field-group">
          <label htmlFor="name-input" className="field-label">
            Your Player Name
          </label>
          <div className="input-with-icon">
            <span className="input-icon">👤</span>
            <input
              id="name-input"
              type="text"
              className="premium-input"
              placeholder="Enter your name (e.g. Vikram)"
              value={nameInput}
              maxLength={18}
              onChange={e => setNameInput(e.target.value)}
            />
          </div>
        </div>

        {/* Action Panels */}
        <div className="landing-actions-stack">
          {/* Create Room Button */}
          <button
            className="btn-gold-action"
            disabled={loading}
            onClick={handleCreate}
          >
            <span className="btn-icon-gold">✦</span>
            <span className="btn-text-main">
              {loading ? 'Creating Arena...' : 'Create New Room'}
            </span>
            <span className="btn-arrow">→</span>
          </button>

          <div className="gold-divider">
            <span className="divider-line" />
            <span className="divider-label">OR ENTER ROOM PIN</span>
            <span className="divider-line" />
          </div>

          {/* Join Existing Room Form */}
          <form onSubmit={handleJoin} className="join-room-row">
            <div className="code-input-wrapper">
              <input
                type="text"
                className="premium-input pin-input"
                placeholder="CODE"
                maxLength={5}
                value={codeInput}
                onChange={e => setCodeInput(e.target.value.toUpperCase())}
              />
            </div>
            <button
              type="submit"
              className="btn-silver-action"
              disabled={loading || codeInput.trim().length < 2}
            >
              Join Room
            </button>
          </form>
        </div>

        {/* Footer Links */}
        <div className="landing-footer">
          <button className="rules-link-btn" onClick={() => setShowRules(true)}>
            📖 Game Rules & How to Play (Spec v1)
          </button>
        </div>
      </motion.div>
    </div>
  );
};
