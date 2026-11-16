import React, { useState } from 'react';
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
    <div className="home-screen">
      <div className="home-card">
        <div className="brand-header">
          <h1 className="game-title">BHABHI</h1>
          <p className="game-subtitle">The Classic Indian Card Game</p>
        </div>

        <div className="input-group">
          <label htmlFor="name-input">Your Display Name</label>
          <input
            id="name-input"
            type="text"
            className="text-input"
            placeholder="Enter your name"
            value={nameInput}
            maxLength={18}
            onChange={e => setNameInput(e.target.value)}
          />
        </div>

        <div className="action-section">
          <button
            className="btn btn-primary btn-large"
            disabled={loading}
            onClick={handleCreate}
          >
            {loading ? 'Creating...' : 'Create New Room'}
          </button>

          <div className="divider">
            <span>OR JOIN EXISTING</span>
          </div>

          <form onSubmit={handleJoin} className="join-form">
            <input
              type="text"
              className="text-input code-input"
              placeholder="ROOM CODE"
              maxLength={5}
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
            />
            <button
              type="submit"
              className="btn btn-secondary btn-large"
              disabled={loading || !codeInput.trim()}
            >
              Join Room
            </button>
          </form>
        </div>

        <div className="footer-links">
          <button className="link-button" onClick={() => setShowRules(true)}>
            📖 How to Play & Rules
          </button>
        </div>
      </div>
    </div>
  );
};
