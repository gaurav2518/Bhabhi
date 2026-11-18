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
    lastEvents,
    setShowRules,
    soundMuted,
    toggleSound,
    setShowHistory,
    setShowChat,
    unreadChatCount,
    showCardNumbersOnly,
    toggleCardNumbersOnly,
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

  const [suitFilter, setSuitFilter] = React.useState<Suit | null>(null);

  // Group cards by suit counts
  const suitCounts = useMemo(() => {
    const counts: Record<Suit, number> = { S: 0, H: 0, D: 0, C: 0 };
    for (const card of sortedHand) {
      counts[card.suit] = (counts[card.suit] || 0) + 1;
    }
    return counts;
  }, [sortedHand]);

  // If filtered suit no longer exists in hand, reset to show all
  React.useEffect(() => {
    if (suitFilter && suitCounts[suitFilter] === 0) {
      setSuitFilter(null);
    }
  }, [suitCounts, suitFilter]);

  const displayedCards = useMemo(() => {
    if (!suitFilter) return sortedHand;
    const filtered = sortedHand.filter(c => c.suit === suitFilter);
    return filtered.length > 0 ? filtered : sortedHand;
  }, [sortedHand, suitFilter]);

  const displayedCount = displayedCards.length;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;

  // Dynamic overlap for player's hand:
  // On mobile, never hide cards down to an invisible 2px sliver; keep at least 27px visible and allow horizontal scroll
  const cardOverlapMargin = useMemo(() => {
    if (displayedCount <= 1) return 0;
    if (isMobile) {
      if (displayedCount <= 4) return -8;
      if (displayedCount <= 7) return -14;
      if (displayedCount <= 10) return -20;
      return -25; // 52px card with -25px overlap = 27px always visible!
    }
    if (displayedCount <= 4) return -12;
    if (displayedCount <= 7) return -24;
    if (displayedCount <= 10) return -34;
    return -38;
  }, [displayedCount, isMobile]);

  // Contextual helper prompt for the player
  const currentTurnSeat = gameState?.turnSeat;
  const activeTurnPlayer = useMemo(() => {
    if (!roomState || currentTurnSeat === undefined) return null;
    return roomState.players.find(p => p.seat === currentTurnSeat) || null;
  }, [roomState, currentTurnSeat]);

  // Pickup alert derived from lastEvents so players can see who cut and what was given
  const pickupAlert = useMemo(() => {
    if (!lastEvents || lastEvents.length === 0 || !roomState) return null;
    const cutEvent = lastEvents.find(e => e.type === 'CUT') as any;
    const pickupEvent = lastEvents.find(e => e.type === 'PICKED_UP') as any;

    if (pickupEvent) {
      const picker = roomState.players.find(p => p.seat === pickupEvent.seat);
      const cutter = cutEvent ? roomState.players.find(p => p.seat === cutEvent.seat) : null;
      return {
        cutterName: cutter?.name,
        pickerName: picker?.name || `Seat ${pickupEvent.seat + 1}`,
        cards: (pickupEvent.cards || []) as Card[],
      };
    }
    return null;
  }, [lastEvents, roomState]);

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
      return 'Trick 1 Rule: Void in Spades! Play a Maaf card of rank ≤ 10 (or any card if none ≤ 10).';
    }

    return `Thola Rule: Void in ${SUIT_NAMES[ledSuit]}! Give Thola with any other suit to pass the trick!`;
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

  // Helper for opponent seat positioning around the table
  const getOpponentPosition = (seat: Seat) => {
    const effectiveMySeat = mySeat ?? 0;
    const relIndex = (seat - effectiveMySeat + totalPlayers) % totalPlayers;
    const opponentCount = totalPlayers - 1;

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;

    if (isMobile) {
      // Mobile-optimized ergonomic layout (keeps seats safely away from center trick cards)
      if (opponentCount === 1) {
        return { left: '50%', top: '16%' };
      }
      if (opponentCount === 2) {
        return relIndex === 1
          ? { left: '24%', top: '18%' }
          : { left: '76%', top: '18%' };
      }
      if (opponentCount === 3) {
        if (relIndex === 1) return { left: '16%', top: '25%' };
        if (relIndex === 2) return { left: '50%', top: '14%' };
        return { left: '84%', top: '25%' };
      }
      if (opponentCount === 4) {
        const positions = [
          { left: '15%', top: '28%' },
          { left: '36%', top: '15%' },
          { left: '64%', top: '15%' },
          { left: '85%', top: '28%' },
        ];
        return positions[relIndex - 1] || { left: '50%', top: '15%' };
      }
      // 5 to 7 opponents: arch along top 185deg -> 355deg
      const startAngle = 185 * (Math.PI / 180);
      const endAngle = 355 * (Math.PI / 180);
      const step = (endAngle - startAngle) / Math.max(opponentCount - 1, 1);
      const angle = startAngle + (relIndex - 1) * step;
      const left = 50 + 40 * Math.cos(angle);
      const top = 25 + 16 * Math.sin(angle);
      return { left: `${left}%`, top: `${top}%` };
    }

    // Desktop wide layout
    if (opponentCount === 1) {
      return { left: '50%', top: '15%' };
    }
    const startAngle = 170 * (Math.PI / 180);
    const endAngle = 370 * (Math.PI / 180);
    const step = (endAngle - startAngle) / (opponentCount - 1);
    const angle = startAngle + (relIndex - 1) * step;
    const radiusX = 40;
    const radiusY = 34;
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
            className={`control-pill ${showCardNumbersOnly ? 'active-pill' : ''}`}
            onClick={toggleCardNumbersOnly}
            title="Toggle Card Count display"
          >
            🔢 <span className="control-label">{showCardNumbersOnly ? 'Numbers: Big' : 'Card Count'}</span>
          </button>

          <button
            className={`control-pill ${unreadChatCount > 0 ? 'chat-has-unread' : ''}`}
            onClick={() => setShowChat(true)}
            title="Table Chat & AI Dealer"
          >
            💬 <span className="control-label">Chat & Bot</span>
            {unreadChatCount > 0 && <span className="unread-counter-dot">{unreadChatCount}</span>}
          </button>

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
                const nameMatch = roomPlayer?.name?.match(/^(\p{Extended_Pictographic}|\S+)\s+(.+)$/u);
                const playerAvatar = roomPlayer?.isBot ? '🤖' : (nameMatch ? nameMatch[1] : '👤');
                const playerCleanName = nameMatch ? nameMatch[2] : (roomPlayer?.name || `Player ${p.seat + 1}`);

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
                        {playerAvatar}
                        {isTurn && <div className="seat-pulse-ring" />}
                        {isLastCard && <div className="seat-danger-ring" />}
                      </div>

                      {/* Prominent Card Count Number Badge */}
                      {!p.out && (
                        <div
                          className={`seat-deck-count ${showCardNumbersOnly ? 'numbers-only-mode' : ''} ${
                            isLastCard ? 'deck-danger-glow' : ''
                          }`}
                          title={`${p.handSize} cards in hand`}
                        >
                          <span className="deck-number-bold">{p.handSize}</span>
                          {!showCardNumbersOnly && <span className="deck-unit-tag">CARDS</span>}
                        </div>
                      )}

                      {/* Large Floating Number Badge in Numbers-Only Mode */}
                      {showCardNumbersOnly && !p.out && (
                        <div className={`seat-large-num-badge ${isLastCard ? 'danger-ring-pulse' : ''}`}>
                          {p.handSize}
                        </div>
                      )}
                    </div>

                    <div className="seat-badge-box">
                      <div className="seat-name-row">
                        <span className="seat-name" title={roomPlayer?.name}>
                          {playerCleanName}
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
                                {isCutter && <span className="cut-badge">THOLA</span>}
                              </div>
                              <CardView card={play.card} size="md" disabled />
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Pickup / Thola Reveal Alert Banner */}
                  <AnimatePresence>
                    {pickupAlert && (
                      <motion.div
                        className="pickup-reveal-banner"
                        initial={{ opacity: 0, scale: 0.9, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -15 }}
                      >
                        <div className="pickup-banner-head">
                          {pickupAlert.cutterName ? (
                            <span className="thoko-tag">⚡ {pickupAlert.cutterName} THOLA!</span>
                          ) : (
                            <span className="thoko-tag">📥 Trick Resolved</span>
                          )}
                          <span className="pickup-recipient-pill">
                            <strong>{pickupAlert.pickerName}</strong> picks up {pickupAlert.cards.length} cards
                          </span>
                        </div>
                        <div className="pickup-cards-display">
                          {pickupAlert.cards.map((c, i) => (
                            <span
                              key={i}
                              className={`pickup-mini-card ${c.suit === 'H' || c.suit === 'D' ? 'card-red' : 'card-black'}`}
                            >
                              {c.id}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
              <div className="status-dock-header-row">
                <span className={`status-dock-title ${isMyTurn ? 'highlight' : ''}`}>
                  {isMyTurn ? 'YOUR TURN' : 'GAME IN PROGRESS'}
                </span>
                {!myPlayerState?.out && (
                  <span className="my-hand-count-pill" title="Cards in your hand">
                    🃏 <strong>{sortedHand.length}</strong> CARDS
                  </span>
                )}
              </div>
              <span className="status-dock-desc">{turnInstruction}</span>
            </div>
          </div>
        </div>

        {/* Interactive Player Hand with Suit Filter Tabs */}
        {!myPlayerState?.out && (
          <div className="hand-dock-container">
            {/* Quick Suit Filter Tabs when player holds more than 6 cards */}
            {sortedHand.length > 6 && (
              <div className="suit-filter-nav">
                <button
                  type="button"
                  className={`suit-filter-pill ${!suitFilter ? 'active' : ''}`}
                  onClick={() => setSuitFilter(null)}
                >
                  ALL ({sortedHand.length})
                </button>
                {(['S', 'H', 'D', 'C'] as Suit[]).map(s => {
                  const count = suitCounts[s];
                  if (count === 0) return null;
                  const isLedSuit = gameState.trick.ledSuit === s;
                  const isRed = s === 'H' || s === 'D';
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`suit-filter-pill ${isRed ? 'suit-red' : 'suit-black'} ${
                        suitFilter === s ? 'active' : ''
                      } ${isLedSuit && isMyTurn ? 'suit-required-glow' : ''}`}
                      onClick={() => setSuitFilter(suitFilter === s ? null : s)}
                      title={`Filter ${SUIT_NAMES[s]}`}
                    >
                      <span className="suit-glyph">{SUIT_GLYPHS[s]}</span>
                      <span className="suit-count">{count}</span>
                      {isLedSuit && isMyTurn && <span className="suit-star">★</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="hand-fanned-tray">
              {displayedCards.map((card, idx) => {
                const mid = (displayedCount - 1) / 2;
                const diff = idx - mid;

                // Subtle fan rotation on mobile when hand is large to prevent cards twisting over each other
                const maxAngle = isMobile ? Math.min(1.0, 16 / Math.max(displayedCount, 1)) : Math.min(2.5, 35 / Math.max(displayedCount, 1));
                const fanRotation = isMobile && displayedCount > 6 ? 0 : diff * maxAngle;
                const fanTranslateY = isMobile && displayedCount > 6 ? 0 : Math.pow(Math.abs(diff) / Math.max(mid, 1), 1.6) * 10;
                const isLegal = isMyTurn && legalSet.has(card.id);

                return (
                  <div
                    key={card.id}
                    className={`card-hand-wrapper ${isLegal ? 'hand-card-legal' : ''}`}
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
