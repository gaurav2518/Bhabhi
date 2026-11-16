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

  return (
    <div className="modal-overlay game-over-overlay">
      <motion.div
        className="modal-card game-over-card"
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        <div className="game-over-header">
          {gameOver.isDraw ? (
            <>
              <div className="result-icon">🤝</div>
              <h1 className="result-title draw">IT'S A DRAW!</h1>
              <p className="result-subtitle">All remaining players emptied their hands simultaneously! Everyone is safe.</p>
            </>
          ) : (
            <>
              <div className="result-icon">{isMeBhabhi ? '😭' : '🚨'}</div>
              <h1 className="result-title loser">
                {isMeBhabhi ? 'YOU ARE THE BHABHI!' : `${bhabhiName} IS THE BHABHI!`}
              </h1>
              <p className="result-subtitle">
                {isMeBhabhi
                  ? 'Better luck next time! You were the last one holding cards.'
                  : `${bhabhiName} got stuck with cards at the end.`}
              </p>
            </>
          )}
        </div>

        <div className="finish-order-section">
          <h3>Finish Positions</h3>
          <div className="finish-list">
            {sortedFinishOrder.map(item => (
              <div key={item.seat} className="finish-row">
                <span className="finish-rank">#{item.finishPosition}</span>
                <span className="finish-name">
                  {getPlayerName(item.seat)} {item.seat === mySeat && '(You)'}
                </span>
                <span className="finish-badge">Safe</span>
              </div>
            ))}

            {!gameOver.isDraw && gameOver.bhabhiSeat !== null && (
              <div className="finish-row finish-row-bhabhi">
                <span className="finish-rank bhabhi-rank">BHABHI</span>
                <span className="finish-name">
                  {bhabhiName} {gameOver.bhabhiSeat === mySeat && '(You)'}
                </span>
                <span className="finish-badge bhabhi-badge">Loser</span>
              </div>
            )}
          </div>
        </div>

        <div className="game-over-actions">
          {isHost ? (
            <button className="btn btn-primary btn-large" onClick={handleRematch}>
              🔄 Play Again (Rematch)
            </button>
          ) : (
            <div className="waiting-rematch">
              <span>Waiting for host to trigger a rematch...</span>
            </div>
          )}

          <button className="btn btn-secondary" onClick={handleLeave}>
            Exit to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
};
