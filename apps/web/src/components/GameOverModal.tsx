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

  const isBotPlayer = (seat: number) => {
    const p = roomState.players.find(x => x.seat === seat);
    return p ? p.isBot : false;
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
    <div className="modal-backdrop-luxury">
      <motion.div
        className="armello-victory-modal"
        initial={{ opacity: 0, scale: 0.85, y: 35 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      >
        {/* Royal Arch Crest at Top (Inspired by Armello) */}
        <div className="royal-crest-crown-header">
          <div className="royal-trumpets">🎺</div>
          <div className="royal-crown-emblem">👑</div>
          <div className="royal-trumpets right">🎺</div>
        </div>

        <div className="victory-ribbon-bar">
          <span className="ribbon-tail left" />
          <h1 className="victory-ribbon-text">
            {gameOver.isDraw ? 'HONORABLE DRAW' : 'MATCH CONCLUDED'}
          </h1>
          <span className="ribbon-tail right" />
        </div>

        <p className="victory-subtitle-text">
          {gameOver.isDraw
            ? 'All remaining contenders emptied their hands simultaneously!'
            : isMeBhabhi
            ? 'You were left with cards and crowned the Bhabhi!'
            : `${bhabhiName} could not get away in time and is the Bhabhi!`}
        </p>

        {/* Heraldic Player Banners (Inspired by Armello Screen) */}
        <div className="heraldic-banners-track">
          {sortedFinishOrder.map(item => {
            const isMe = item.seat === mySeat;
            const isWinner = item.finishPosition === 1;
            const isBot = isBotPlayer(item.seat);

            return (
              <motion.div
                key={item.seat}
                className={`heraldic-banner ${isWinner ? 'banner-champion' : 'banner-safe'} ${
                  isMe ? 'banner-me' : ''
                }`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * item.finishPosition, duration: 0.4 }}
              >
                {/* Banner Crown / Crest Top */}
                <div className="banner-top-finial">
                  {isWinner ? <span className="champ-crown">👑</span> : <span className="safe-star">✦</span>}
                </div>

                {/* Avatar Shield */}
                <div className="banner-avatar-frame">
                  <div className="banner-avatar-icon">{isBot ? '🤖' : '👤'}</div>
                  <span className="rank-badge-pill">#{item.finishPosition}</span>
                </div>

                {/* Player Name */}
                <div className="banner-name-block">
                  <span className="banner-player-name" title={getPlayerName(item.seat)}>
                    {getPlayerName(item.seat)}
                  </span>
                  {isMe && <span className="banner-you-tag">(YOU)</span>}
                </div>

                {/* Outcome Medals & Status */}
                <div className="banner-stats-tray">
                  <div className="banner-medal-row">
                    <span className="medal-icon">{isWinner ? '🥇' : item.finishPosition === 2 ? '🥈' : '🥉'}</span>
                    <span className="medal-label">{isWinner ? '1st Place' : 'Safe'}</span>
                  </div>
                  <div className="banner-ribbon-status">
                    <span>{isWinner ? 'CHAMPION' : 'SURVIVED'}</span>
                  </div>
                </div>

                {/* Banner Bottom Cutout */}
                <div className="banner-bottom-cutout" />
              </motion.div>
            );
          })}

          {/* Bhabhi (Loser) Heraldic Banner */}
          {!gameOver.isDraw && gameOver.bhabhiSeat !== null && (
            <motion.div
              className={`heraldic-banner banner-bhabhi ${isMeBhabhi ? 'banner-me' : ''}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * (sortedFinishOrder.length + 1), duration: 0.4 }}
            >
              <div className="banner-top-finial bhabhi-finial">
                <span className="bhabhi-skull-top">💀</span>
              </div>

              <div className="banner-avatar-frame bhabhi-frame">
                <div className="banner-avatar-icon">
                  {isBotPlayer(gameOver.bhabhiSeat) ? '🤖' : '👤'}
                </div>
                <span className="rank-badge-pill bhabhi-pill">LOSER</span>
              </div>

              <div className="banner-name-block">
                <span className="banner-player-name bhabhi-text" title={bhabhiName || ''}>
                  {bhabhiName}
                </span>
                {isMeBhabhi && <span className="banner-you-tag danger">(YOU)</span>}
              </div>

              <div className="banner-stats-tray bhabhi-tray">
                <div className="banner-medal-row">
                  <span className="medal-icon">🚨</span>
                  <span className="medal-label">The Bhabhi</span>
                </div>
                <div className="banner-ribbon-status bhabhi-status">
                  <span>DEFEATED</span>
                </div>
              </div>

              <div className="banner-bottom-cutout bhabhi-cutout" />
            </motion.div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="victory-footer-row">
          {isHost ? (
            <button className="btn-gold-action btn-rematch-royal" onClick={handleRematch}>
              <span>✦ START REMATCH ✦</span>
            </button>
          ) : (
            <div className="waiting-rematch-pill">
              <div className="gold-spinner" />
              <span>Waiting for host to call rematch...</span>
            </div>
          )}

          <button className="btn-silver-action" onClick={handleLeave}>
            Exit to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
};
