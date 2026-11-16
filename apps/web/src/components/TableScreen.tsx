import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../socket';
import { useStore } from '../store';
import { CardView } from './CardView';
import { CountdownRing } from './CountdownRing';
import type { Card, Seat, Suit } from '../types';

const SUIT_ORDER: Record<Suit, number> = {
  S: 0,
  H: 1,
  D: 2,
  C: 3,
};

const SUIT_NAMES: Record<Suit, string> = {
  S: 'Spades ♠',
  H: 'Hearts ♥',
  D: 'Diamonds ♦',
  C: 'Clubs ♣',
};

export const TableScreen: React.FC = () => {
  const {
    roomState,
    gameState,
    mySeat,
    legalCardIds,
    turnDeadline,
    setShowRules,
  } = useStore();

  const isMyTurn = gameState ? gameState.turnSeat === mySeat : false;
  const legalSet = useMemo(() => new Set(legalCardIds), [legalCardIds]);

  // Find local player state
  const myPlayerState = useMemo(() => {
    if (!gameState || mySeat === null) return null;
    return gameState.players.find(p => p.seat === mySeat);
  }, [gameState, mySeat]);

  // Sorted hand for local player: suit then rank
  const sortedHand = useMemo(() => {
    if (!myPlayerState?.hand) return [];
    return [...myPlayerState.hand].sort((a, b) => {
      const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
      if (suitDiff !== 0) return suitDiff;
      return a.rank - b.rank;
    });
  }, [myPlayerState]);

  if (!roomState || !gameState) return null;

  const totalPlayers = gameState.players.length;
  const currentTurnSeat = gameState.turnSeat;
  const activeTurnPlayer = roomState.players.find(p => p.seat === currentTurnSeat);

  const handlePlayCard = (card: Card) => {
    if (!isMyTurn || !legalSet.has(card.id)) return;
    socket.emit('game:play', { cardId: card.id });
  };

  // Helper to get opponent position on the table
  const getOpponentPosition = (seat: Seat) => {
    const effectiveMySeat = mySeat ?? 0;
    const relIndex = (seat - effectiveMySeat + totalPlayers) % totalPlayers;
    // Map relative index (1..N-1) to angle from bottom (PI/2) clockwise
    const angle = (Math.PI / 2) + (relIndex / totalPlayers) * 2 * Math.PI;
    const radiusX = 42; // percent
    const radiusY = 38; // percent

    const left = 50 + radiusX * Math.cos(angle);
    const top = 50 + radiusY * Math.sin(angle);
    return { left: `${left}%`, top: `${top}%` };
  };

  return (
    <div className="table-screen">
      {/* Top Header Bar */}
      <header className="table-header">
        <div className="table-header-left">
          <span className="room-pill">Room: {roomState.code}</span>
          <span className="trick-pill">Trick #{gameState.trickNumber}</span>
          <span className="discard-pill">
            Discarded: {gameState.discardCount || gameState.discard.length}
          </span>
        </div>

        <div className="table-header-right">
          <button className="btn-icon" onClick={() => setShowRules(true)}>
            📖 Rules
          </button>
        </div>
      </header>

      {/* Main Poker / Card Table Felt */}
      <div className="table-felt">
        {/* Opponents Circle */}
        {gameState.players.map(p => {
          if (p.seat === mySeat) return null; // local player rendered at bottom
          const roomPlayer = roomState.players.find(rp => rp.seat === p.seat);
          const isTurn = gameState.turnSeat === p.seat;
          const pos = getOpponentPosition(p.seat);

          return (
            <motion.div
              key={p.seat}
              className={`opponent-pod ${isTurn ? 'pod-turn' : ''} ${p.out ? 'pod-out' : ''}`}
              style={{ left: pos.left, top: pos.top }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <div className="opponent-avatar">
                {roomPlayer?.isBot ? '🤖' : '👤'}
                {isTurn && <div className="turn-pulse-ring" />}
              </div>

              <div className="opponent-info">
                <span className="opponent-name">{roomPlayer?.name || `Seat ${p.seat}`}</span>
                {p.out ? (
                  <span className="badge-out">OUT (#{p.finishPosition})</span>
                ) : (
                  <span className="badge-cards">{p.handSize} card{p.handSize !== 1 ? 's' : ''}</span>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Center Trick Area */}
        <div className="trick-center">
          <div className="trick-header">
            {gameState.trick.ledSuit ? (
              <span className="led-suit-badge">
                Led Suit: <strong>{SUIT_NAMES[gameState.trick.ledSuit]}</strong>
              </span>
            ) : (
              <span className="led-suit-badge pending">
                {gameState.trick.isFirstTrick ? 'Leading: Must play A♠' : 'Waiting for Lead'}
              </span>
            )}
          </div>

          <div className="trick-cards-layout">
            <AnimatePresence>
              {gameState.trick.plays.length === 0 ? (
                <div className="trick-empty-placeholder">
                  <span>Trick area</span>
                </div>
              ) : (
                gameState.trick.plays.map(play => {
                  const playerMeta = roomState.players.find(rp => rp.seat === play.seat);
                  const isCutter = play.card.suit !== gameState.trick.ledSuit;

                  return (
                    <motion.div
                      key={`${play.seat}-${play.card.id}`}
                      className="trick-play-slot"
                      initial={{ scale: 0.4, y: 50, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      exit={{ scale: 0.3, y: -40, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                    >
                      <span className="play-seat-label">
                        {playerMeta?.name || `Seat ${play.seat}`}
                        {isCutter && <span className="cut-tag">CUT</span>}
                      </span>
                      <CardView card={play.card} size="md" disabled />
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom Area: Turn Status & My Hand */}
      <footer className="table-bottom-bar">
        {/* Turn Status Banner */}
        <div className="turn-banner">
          <div className="turn-banner-content">
            <CountdownRing
              deadline={turnDeadline}
              isMyTurn={isMyTurn}
              size={48}
            />
            <div className="turn-banner-text">
              {myPlayerState?.out ? (
                <span className="text-safe">🎉 You are SAFE! (Finish #{myPlayerState.finishPosition})</span>
              ) : isMyTurn ? (
                <span className="text-my-turn">👉 YOUR TURN! Choose a highlighted card</span>
              ) : (
                <span className="text-waiting">
                  Waiting for <strong>{activeTurnPlayer?.name || `Seat ${currentTurnSeat}`}</strong>...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* My Fanned Hand */}
        {!myPlayerState?.out && (
          <div className="my-hand-container">
            <div className="hand-fanned">
              {sortedHand.map((card, idx) => {
                const count = sortedHand.length;
                const mid = (count - 1) / 2;
                const diff = idx - mid;

                // Subtle fan rotation and arc offset
                const maxAngle = Math.min(3, 40 / Math.max(count, 1));
                const fanRotation = diff * maxAngle;
                const fanTranslateY = Math.abs(diff) * 2.2;
                const isLegal = isMyTurn && legalSet.has(card.id);

                return (
                  <div
                    key={card.id}
                    className="card-wrapper"
                    style={{
                      marginLeft: idx === 0 ? 0 : -32,
                      zIndex: idx + 1,
                    }}
                  >
                    <CardView
                      card={card}
                      size="lg"
                      isFanned
                      fanRotation={fanRotation}
                      fanTranslateY={fanTranslateY}
                      isLegal={isLegal}
                      disabled={!isLegal}
                      onClick={() => handlePlayCard(card)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
};
