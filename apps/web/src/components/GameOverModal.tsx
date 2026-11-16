import React from 'react';
import { motion } from 'framer-motion';
import { socket } from '../socket';
import { useStore } from '../store';

export const GameOverModal: React.FC = () => {
  const { gameOver, roomState, mySeat, clearSession } = useStore();

  if (!gameOver || !roomState) return null;

  const isHost = mySeat === roomState.hostSeat;

  const getPlayerName = (seat: number) => {
    const p = roomState.players.find(x => x.seat === seat);
    return p ? p.name : `Seat ${seat + 1}`;
  };

  const bhabhiName = gameOver.bhabhiSeat !== null ? getPlayerName(gameOver.bhabhiSeat) : null;
  const isMeBhabhi = gameOver.bhabhiSeat !== null && gameOver.bhabhiSeat === mySeat;

  const handleRematch = () => {
    socket.emit('room:rematch');
  };

  const handleLeave = () => {
    socket.emit('room:leave');
    clearSession();
  };

  // Sort finish order by finish position ascending
  const sortedFinishOrder = [...gameOver.finishOrder].sort((a, b) => a.finishPosition - b.finishPosition);

  const getRankMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="modal-backdrop-luxury">
      <motion.div
        className="game-over-modal-panel"
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      >
        {/* Outcome Header Banner */}
        <div className="game-over-banner">
          {gameOver.isDraw ? (
            <div className="result-crest draw">
              <span className="crest-symbol">🤝</span>
              <h1 className="outcome-headline draw">HONORABLE DRAW!</h1>
              <p className="outcome-subtext">
                All final active players emptied their cards simultaneously. Everyone is victorious!
              </p>
            </div>
          ) : (
            <div className="result-crest bhabhi">
              <span className="crest-symbol">{isMeBhabhi ? '😭' : '🚨'}</span>
              <h1 className="outcome-headline bhabhi">
                {isMeBhabhi ? 'YOU ARE THE BHABHI!' : `${bhabhiName} IS THE BHABHI!`}
              </h1>
              <p className="outcome-subtext">
                {isMeBhabhi
                  ? 'You were the last player holding cards. Better luck in the next round!'
                  : `${bhabhiName} could not get away in time and takes the loss.`}
              </p>
            </div>
          )}
        </div>

        {/* Podium & Finish Order */}
        <div className="finish-podium-card">
          <div className="podium-title">FINAL FINISH ORDER</div>

          <div className="podium-list">
            {sortedFinishOrder.map(item => {
              const isMe = item.seat === mySeat;
              return (
                <div key={item.seat} className={`podium-row ${isMe ? 'podium-row-me' : ''}`}>
                  <span className="podium-rank">{getRankMedal(item.finishPosition)}</span>
                  <div className="podium-player">
                    <span className="podium-name">{getPlayerName(item.seat)}</span>
                    {isMe && <span className="podium-me-tag">YOU</span>}
                  </div>
                  <span className="podium-status-safe">SAFE ✓</span>
                </div>
              );
            })}

            {!gameOver.isDraw && gameOver.bhabhiSeat !== null && (
              <div className={`podium-row podium-row-bhabhi ${isMeBhabhi ? 'podium-row-me' : ''}`}>
                <span className="podium-rank bhabhi-icon">💀</span>
                <div className="podium-player">
                  <span className="podium-name bhabhi-name">{bhabhiName}</span>
                  {isMeBhabhi && <span className="podium-me-tag danger">YOU</span>}
                </div>
                <span className="podium-status-bhabhi">BHABHI (LOSER)</span>
              </div>
            )}
          </div>
        </div>

        {/* Rematch & Navigation Actions */}
        <div className="game-over-footer-actions">
          {isHost ? (
            <button className="btn-gold-action btn-rematch" onClick={handleRematch}>
              <span>🔄 PLAY REMATCH</span>
            </button>
          ) : (
            <div className="waiting-rematch-card">
              <div className="gold-spinner" />
              <span>Waiting for host to call rematch...</span>
            </div>
          )}

          <button className="btn-silver-action btn-exit" onClick={handleLeave}>
            Exit to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
};
