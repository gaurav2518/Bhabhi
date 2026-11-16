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

const SUIT_GLYPHS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

export const TableScreen: React.FC = () => {
  const {
    roomState,
    gameState,
    mySeat,
    legalCardIds,
    turnDeadline,
    setShowRules,
    soundMuted,
    toggleSound,
    setShowHistory,
    addToast,
  } = useStore();

  const isMyTurn = gameState ? gameState.turnSeat === mySeat : false;
  const legalSet = useMemo(() => new Set(legalCardIds), [legalCardIds]);

  // Local player state
  const myPlayerState = useMemo(() => {
    if (!gameState || mySeat === null) return null;
    return gameState.players.find(p => p.seat === mySeat);
  }, [gameState, mySeat]);

  // Sorted hand for local player: suit then rank ascending
  const sortedHand = useMemo(() => {
    if (!myPlayerState?.hand) return [];
    return [...myPlayerState.hand].sort((a, b) => {
      const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
      if (suitDiff !== 0) return suitDiff;
      return a.rank - b.rank;
    });
  }, [myPlayerState]);

  // Dynamic overlap for player's hand to prevent horizontal scrolling
  const handCount = sortedHand.length;
  const cardOverlapMargin = useMemo(() => {
    if (handCount <= 1) return 0;
    if (handCount <= 4) return -12;
    if (handCount <= 7) return -24;
    if (handCount <= 10) return -34;
    return -42; // Up to 13 cards fits comfortably within 600px width
  }, [handCount]);

  // Contextual helper prompt for the player
  const currentTurnSeat = gameState?.turnSeat;
  const activeTurnPlayer = useMemo(() => {
    if (!roomState || currentTurnSeat === undefined) return null;
    return roomState.players.find(p => p.seat === currentTurnSeat) || null;
  }, [roomState, currentTurnSeat]);

  const turnInstruction = useMemo(() => {
    if (!gameState) return 'Entering arena...';
    if (myPlayerState?.out) {
      return `Safe! You finished at #${myPlayerState.finishPosition}`;
    }
    if (!isMyTurn) {
      return `Waiting for ${activeTurnPlayer?.name || `Seat ${currentTurnSeat}`}...`;
    }

    const ledSuit = gameState.trick.ledSuit;
    if (!ledSuit) {
      if (gameState.trick.isFirstTrick) {
        return 'Trick 1: You hold A♠ and must open the game with A♠!';
      }
      return 'Lead any card of your choice to start this trick.';
    }

    const hasLedSuit = sortedHand.some(c => c.suit === ledSuit);
    if (hasLedSuit) {
      return `Follow Rule: You must play a ${SUIT_NAMES[ledSuit]} card.`;
    }

    if (gameState.trick.isFirstTrick) {
      return 'Cut Rule (Trick 1): Void in Spades! Cut with rank ≤ 10 (or any card if none ≤ 10).';
    }

    return `Cut Rule: Void in ${SUIT_NAMES[ledSuit]}! Cut with any other suit to pick up the trick!`;
  }, [isMyTurn, myPlayerState, activeTurnPlayer, currentTurnSeat, gameState, sortedHand]);

  if (!roomState || !gameState) {
    return (
      <div className="table-viewport table-loading-screen">
        <div className="gold-spinner" />
        <span style={{ color: '#d4af37', fontWeight: 800, marginTop: '1rem', letterSpacing: '0.1em' }}>
          ENTERING ARENA...
        </span>
      </div>
    );
  }

  const totalPlayers = gameState.players.length;

  const handlePlayCard = (card: Card) => {
    if (!isMyTurn || !legalSet.has(card.id)) return;
    socket.emit('game:play', { cardId: card.id });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomState.code);
      addToast('Room code copied to clipboard!', 'info');
    } catch {
      addToast(`Code: ${roomState.code}`, 'info');
    }
  };

  // Helper for opponent seat positioning around an ellipse
  const getOpponentPosition = (seat: Seat) => {
    const effectiveMySeat = mySeat ?? 0;
    const relIndex = (seat - effectiveMySeat + totalPlayers) % totalPlayers;
    const opponentCount = totalPlayers - 1;

    // Direct geometric layout for best visual aesthetics
    if (opponentCount === 1) {
      return { left: '50%', top: '15%' };
    }

    // Spread opponents along the top 210 degrees arc (from 195deg to -15deg)
    // 0 = right, 90 = bottom (me), 180 = left, 270 = top
    // Opponents spread from ~165deg (left) around top (270deg) to ~375deg (right)
    const startAngle = 170 * (Math.PI / 180);
    const endAngle = 370 * (Math.PI / 180);
    const step = (endAngle - startAngle) / (opponentCount - 1);
    const angle = startAngle + (relIndex - 1) * step;

    const radiusX = 40; // %
    const radiusY = 34; // %
    const left = 50 + radiusX * Math.cos(angle);
    const top = 48 + radiusY * Math.sin(angle);

    return { left: `${left}%`, top: `${top}%` };
  };

  return (
    <div className="table-viewport">
      {/* Top Header Navigation */}
      <header className="casino-header">
        <div className="casino-header-left">
          <div className="brand-badge">
            <span className="brand-logo-spade">♠</span>
            <span className="brand-title">BHABHI</span>
          </div>

          <button className="code-pill" onClick={handleCopyCode} title="Click to copy code">
            <span className="pill-label">ROOM</span>
            <span className="pill-code">{roomState.code}</span>
            <span className="pill-icon">📋</span>
          </button>

          <div className="stat-pill">
            <span className="pill-label">TRICK</span>
            <span className="pill-value">#{gameState.trickNumber}</span>
          </div>

          <div className="stat-pill">
            <span className="pill-label">DISCARD</span>
            <span className="pill-value">{gameState.discardCount || gameState.discard.length}</span>
          </div>
        </div>

        <div className="casino-header-right">
          <button
            className={`control-pill ${soundMuted ? 'muted' : ''}`}
            onClick={toggleSound}
            title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {soundMuted ? '🔇' : '🔊'}
            <span className="control-label">{soundMuted ? 'Muted' : 'Sound'}</span>
          </button>

          <button className="control-pill" onClick={() => setShowHistory(true)} title="Game History">
            📜 <span className="control-label">History</span>
          </button>

          <button className="control-pill" onClick={() => setShowRules(true)} title="Rules">
            📖 <span className="control-label">Rules</span>
          </button>
        </div>
      </header>

      {/* Main Table Arena */}
      <main className="table-arena">
        {/* Luxury Padded Leather Rail */}
        <div className="poker-table-rail">
          {/* Wooden Bevel & Gold Inlay Ring */}
          <div className="poker-table-wood">
            {/* Deep Emerald Felt Surface */}
            <div className="poker-table-felt">
              {/* Felt Texture & Radial Spotlight */}
              <div className="felt-lighting" />
              <div className="felt-watermark">
                <span className="felt-spade">♠</span>
                <span className="felt-text">BHABHI ARENA</span>
              </div>

              {/* Opponent Seats Placed Around Table */}
              {gameState.players.map(p => {
                if (p.seat === mySeat) return null;
                const roomPlayer = roomState.players.find(rp => rp.seat === p.seat);
                const isTurn = gameState.turnSeat === p.seat;
                const isLastCard = p.handSize === 1 && !p.out;
                const pos = getOpponentPosition(p.seat);

                return (
                  <motion.div
                    key={p.seat}
                    className={`seat-pod ${isTurn ? 'seat-turn' : ''} ${p.out ? 'seat-out' : ''} ${
                      isLastCard ? 'seat-last-card' : ''
                    }`}
                    style={{ left: pos.left, top: pos.top }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 20 }}
                  >
                    {/* Active Spotlight on the felt beneath turn player */}
                    {isTurn && <div className="seat-spotlight" />}

                    <div className="seat-avatar-container">
                      <div className="seat-avatar">
                        {roomPlayer?.isBot ? '🤖' : '👤'}
                        {isTurn && <div className="seat-pulse-ring" />}
                        {isLastCard && <div className="seat-danger-ring" />}
                      </div>

                      {/* Mini Deck Card Counter */}
                      {!p.out && (
                        <div className="seat-deck-count" title={`${p.handSize} cards in hand`}>
                          <span className="deck-icon">🂠</span>
                          <span className="deck-number">{p.handSize}</span>
                        </div>
                      )}
                    </div>

                    <div className="seat-badge-box">
                      <div className="seat-name-row">
                        <span className="seat-name" title={roomPlayer?.name}>
                          {roomPlayer?.name || `Player ${p.seat + 1}`}
                        </span>
                        {roomPlayer?.isBot && <span className="bot-tag">BOT</span>}
                      </div>

                      {p.out ? (
                        <div className="status-pill status-safe">
                          ✓ SAFE (#{p.finishPosition})
                        </div>
                      ) : isLastCard ? (
                        <div className="status-pill status-danger">
                          ⚠️ 1 CARD LEFT!
                        </div>
                      ) : isTurn ? (
                        <div className="status-pill status-turn">
                          THINKING...
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}

              {/* Center Playing Felt Arena */}
              <div className="center-trick-arena">
                <div className="trick-gold-ring">
                  {/* Led Suit Banner */}
                  <div className="trick-status-header">
                    {gameState.trick.ledSuit ? (
                      <div className="led-suit-chip">
                        <span className="led-suit-icon">
                          {SUIT_GLYPHS[gameState.trick.ledSuit]}
                        </span>
                        <span className="led-suit-text">
                          LED SUIT: <strong>{SUIT_NAMES[gameState.trick.ledSuit]}</strong>
                        </span>
                      </div>
                    ) : (
                      <div className="led-suit-chip waiting">
                        <span className="led-suit-icon">✦</span>
                        <span className="led-suit-text">
                          {gameState.trick.isFirstTrick ? 'OPENING: MUST LEAD A♠' : 'WAITING FOR LEAD'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Played Cards in Current Trick */}
                  <div className="trick-cards-container">
                    <AnimatePresence mode="popLayout">
                      {gameState.trick.plays.length === 0 ? (
                        <div className="trick-empty-bay">
                          <span className="bay-icon">🂠</span>
                          <span className="bay-text">Trick Area</span>
                        </div>
                      ) : (
                        gameState.trick.plays.map((play, playIdx) => {
                          const playerMeta = roomState.players.find(rp => rp.seat === play.seat);
                          const isCutter = play.card.suit !== gameState.trick.ledSuit;

                          return (
                            <motion.div
                              key={`${play.seat}-${play.card.id}`}
                              className="played-card-slot"
                              initial={{ scale: 0.3, y: 70, opacity: 0 }}
                              animate={{ scale: 1, y: 0, opacity: 1 }}
                              exit={{ scale: 0.2, y: -50, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                              style={{ zIndex: playIdx + 1 }}
                            >
                              <div className="played-by-tag">
                                <span>{playerMeta?.name || `Seat ${play.seat + 1}`}</span>
                                {isCutter && <span className="cut-badge">CUT</span>}
                              </div>
                              <CardView card={play.card} size="md" disabled />
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Control & Hand Section */}
      <footer className="player-deck-tray">
        {/* Turn Status & Prompt Bar */}
        <div className="status-dock">
          <div className={`status-dock-card ${isMyTurn ? 'dock-active' : ''}`}>
            <CountdownRing
              deadline={turnDeadline}
              isMyTurn={isMyTurn}
              size={44}
              strokeWidth={4}
            />
            <div className="status-dock-info">
              <span className={`status-dock-title ${isMyTurn ? 'highlight' : ''}`}>
                {isMyTurn ? 'YOUR TURN' : 'GAME IN PROGRESS'}
              </span>
              <span className="status-dock-desc">{turnInstruction}</span>
            </div>
          </div>
        </div>

        {/* Fanned Player Hand */}
        {!myPlayerState?.out && (
          <div className="hand-dock-container">
            <div className="hand-fanned-tray">
              {sortedHand.map((card, idx) => {
                const mid = (handCount - 1) / 2;
                const diff = idx - mid;

                // Elegant curved fan rotation and vertical curve
                const maxAngle = Math.min(2.5, 35 / Math.max(handCount, 1));
                const fanRotation = diff * maxAngle;
                const fanTranslateY = Math.pow(Math.abs(diff) / Math.max(mid, 1), 1.6) * 10;
                const isLegal = isMyTurn && legalSet.has(card.id);

                return (
                  <div
                    key={card.id}
                    className="card-hand-wrapper"
                    style={{
                      marginLeft: idx === 0 ? 0 : `${cardOverlapMargin}px`,
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
