import React, { useState } from 'react';
import { socket } from '../socket';
import { useStore } from '../store';

export const LobbyScreen: React.FC = () => {
  const { roomState, mySeat, clearSession, setShowRules, addToast } = useStore();
  const [copied, setCopied] = useState(false);

  if (!roomState) return null;

  const isHost = mySeat === roomState.hostSeat;
  const playerCount = roomState.players.length;
  const canStart = isHost && playerCount >= 2 && playerCount <= 8;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomState.code);
      setCopied(true);
      addToast('Room code copied to clipboard!', 'info');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast(`Code: ${roomState.code}`, 'info');
    }
  };

  const handleAddBot = () => {
    socket.emit('room:addBot');
  };

  const handleRemoveBot = (seat: number) => {
    socket.emit('room:removeBot', { seat });
  };

  const handleStartGame = () => {
    socket.emit('room:start');
  };

  const handleLeave = () => {
    socket.emit('room:leave');
    clearSession();
  };

  return (
    <div className="lobby-screen">
      <div className="lobby-card">
        <div className="lobby-header">
          <div className="room-code-badge">
            <span className="code-label">ROOM CODE</span>
            <span className="code-value">{roomState.code}</span>
            <button className="btn-copy" onClick={handleCopyCode} title="Copy Room Code">
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>

          <div className="header-actions">
            <button className="btn-icon" onClick={() => setShowRules(true)} title="Rules">
              📖 Rules
            </button>
            <button className="btn-icon btn-danger-ghost" onClick={handleLeave} title="Leave Room">
              ✕ Leave
            </button>
          </div>
        </div>

        <div className="lobby-body">
          <div className="section-title-row">
            <h3>Players ({playerCount} / 8)</h3>
            {playerCount < 2 && <span className="warning-pill">Min 2 players to start</span>}
          </div>

          <div className="players-list">
            {roomState.players.map(p => {
              const isMe = p.seat === mySeat;
              const isPlayerHost = p.seat === roomState.hostSeat;

              return (
                <div key={p.seat} className={`player-row ${isMe ? 'player-row-me' : ''}`}>
                  <div className="player-info">
                    <span className="seat-badge">Seat {p.seat + 1}</span>
                    <span className="player-name">
                      {p.name} {isMe && '(You)'}
                    </span>
                    {isPlayerHost && <span className="host-badge">👑 Host</span>}
                    {p.isBot && <span className="bot-badge">🤖 Bot</span>}
                    {!p.isBot && !p.connected && (
                      <span className="disconnected-badge">Disconnected</span>
                    )}
                  </div>

                  {isHost && p.isBot && (
                    <button
                      className="btn-danger-small"
                      onClick={() => handleRemoveBot(p.seat)}
                      title="Remove Bot"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isHost && (
            <div className="host-controls">
              <button
                className="btn btn-secondary"
                disabled={playerCount >= 8}
                onClick={handleAddBot}
              >
                + Add Bot
              </button>

              <button
                className="btn btn-primary btn-large btn-start"
                disabled={!canStart}
                onClick={handleStartGame}
              >
                Start Game ({playerCount} Players)
              </button>
            </div>
          )}

          {!isHost && (
            <div className="waiting-indicator">
              <div className="spinner"></div>
              <span>Waiting for host to start the game...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
