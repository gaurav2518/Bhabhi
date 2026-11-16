import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
    <div className="lobby-viewport">
      <div className="landing-ambient-glow" />

      <motion.div
        className="lobby-card-panel"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Lobby Top Banner */}
        <div className="lobby-top-bar">
          <div className="lobby-code-box">
            <span className="code-sub">ROOM PIN</span>
            <div className="code-display">
              <span className="code-text">{roomState.code}</span>
              <button className="code-copy-btn" onClick={handleCopyCode} title="Copy Code">
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>

          <div className="lobby-header-actions">
            <button className="pill-btn" onClick={() => setShowRules(true)}>
              📖 Rules
            </button>
            <button className="pill-btn danger" onClick={handleLeave}>
              ✕ Leave
            </button>
          </div>
        </div>

        {/* Player Roster Section */}
        <div className="lobby-roster-section">
          <div className="roster-header">
            <h3>SEATED PLAYERS ({playerCount} / 8)</h3>
            {playerCount < 2 && (
              <span className="min-req-chip">Need min 2 players to start</span>
            )}
          </div>

          <div className="roster-grid">
            {roomState.players.map(p => {
              const isMe = p.seat === mySeat;
              const isPlayerHost = p.seat === roomState.hostSeat;

              return (
                <div key={p.seat} className={`roster-slot ${isMe ? 'slot-me' : ''}`}>
                  <div className="slot-avatar-wrap">
                    <div className="slot-avatar">{p.isBot ? '🤖' : '👤'}</div>
                    {isPlayerHost && <span className="crown-badge" title="Room Host">👑</span>}
                  </div>

                  <div className="slot-details">
                    <div className="slot-name-row">
                      <span className="slot-name">{p.name}</span>
                      {isMe && <span className="you-tag">(YOU)</span>}
                    </div>
                    <div className="slot-badges">
                      <span className="seat-num">Seat {p.seat + 1}</span>
                      {p.isBot && <span className="bot-chip">BOT</span>}
                      {!p.isBot && !p.connected && (
                        <span className="offline-chip">OFFLINE</span>
                      )}
                    </div>
                  </div>

                  {isHost && p.isBot && (
                    <button
                      className="btn-remove-bot"
                      onClick={() => handleRemoveBot(p.seat)}
                      title="Remove Bot"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}

            {/* Empty slots placeholders */}
            {Array.from({ length: Math.max(0, 8 - playerCount) }).map((_, i) => (
              <div key={`empty-${i}`} className="roster-slot empty-slot">
                <span className="empty-seat-num">Seat {playerCount + i + 1}</span>
                <span className="empty-label">Open Slot</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lobby Action Controls */}
        <div className="lobby-action-footer">
          {isHost ? (
            <div className="host-btn-row">
              <button
                className="btn-silver-action"
                disabled={playerCount >= 8}
                onClick={handleAddBot}
              >
                + Add AI Bot
              </button>

              <button
                className="btn-gold-action btn-start-game"
                disabled={!canStart}
                onClick={handleStartGame}
              >
                <span>✦ START MATCH ({playerCount}P) ✦</span>
              </button>
            </div>
          ) : (
            <div className="waiting-host-box">
              <div className="gold-spinner" />
              <span>Waiting for host to launch the match...</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
