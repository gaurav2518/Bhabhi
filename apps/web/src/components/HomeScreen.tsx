import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { socket } from '../socket';
import { useStore } from '../store';
import { CardView } from './CardView';
import type { Card } from '../types';

const AVATARS = [
  { id: 'crown', emoji: '👑', label: 'Maharaja' },
  { id: 'lion', emoji: '🦁', label: 'Sher' },
  { id: 'tiger', emoji: '🐯', label: 'Bagh' },
  { id: 'peacock', emoji: '🦚', label: 'Mayur' },
  { id: 'falcon', emoji: '🦅', label: 'Baaz' },
  { id: 'fox', emoji: '🦊', label: 'Lomdi' },
];

// Showcase cards for the luxury 3D hero fan
const SHOWCASE_CARDS: Array<{ card: Card; rot: number; y: number; isCenter?: boolean }> = [
  { card: { id: 'C10', suit: 'C', rank: 10 }, rot: -28, y: 18 },
  { card: { id: 'D12', suit: 'D', rank: 12 }, rot: -14, y: 6 },
  { card: { id: 'S14', suit: 'S', rank: 14 }, rot: 0, y: -10, isCenter: true },
  { card: { id: 'H13', suit: 'H', rank: 13 }, rot: 14, y: 6 },
  { card: { id: 'C11', suit: 'C', rank: 11 }, rot: 28, y: 18 },
];

export const HomeScreen: React.FC = () => {
  const {
    playerName,
    setPlayerName,
    setSession,
    setError,
    setShowRules,
    soundMuted,
    toggleSound,
  } = useStore();

  const [nameInput, setNameInput] = useState(playerName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(
    () => localStorage.getItem('bhabhi_player_avatar') || '👑'
  );
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  const handleSelectAvatar = (emoji: string) => {
    setSelectedAvatar(emoji);
    localStorage.setItem('bhabhi_player_avatar', emoji);
  };

  const getFullPlayerName = () => {
    const raw = nameInput.trim() || 'Player 1';
    return `${selectedAvatar} ${raw}`;
  };

  const handleCreate = () => {
    const finalName = getFullPlayerName();
    setPlayerName(nameInput.trim() || 'Player 1');
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
    const finalName = getFullPlayerName();
    const code = codeInput.trim().toUpperCase();

    if (!code) {
      setError('Please enter a 5-character room code');
      return;
    }

    setPlayerName(nameInput.trim() || 'Player');
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
      {/* Ambient Casino Lighting & Atmospheric Backdrop */}
      <div className="landing-backdrop-felt" />
      <div className="landing-ambient-spotlight" />
      <div className="landing-ambient-gold-rays" />
      
      {/* Floating Animated Card Suits */}
      <div className="floating-suit suit-top-left">♠</div>
      <div className="floating-suit suit-bottom-left">♥</div>
      <div className="floating-suit suit-top-right">♦</div>
      <div className="floating-suit suit-bottom-right">♣</div>

      {/* Top Navbar: Quick Rules & Sound Control */}
      <header className="landing-top-bar">
        <div className="landing-top-brand">
          <span className="gold-spade-icon">♠</span>
          <span className="brand-badge-text">ROYAL TABLE ED.</span>
        </div>
        <div className="landing-top-actions">
          <button
            className="top-pill-btn"
            onClick={() => setShowRules(true)}
            title="Read Rules & How to Play"
          >
            <span>📜</span>
            <span className="top-btn-label">Rules Guide</span>
          </button>
          <button
            className="top-pill-btn"
            onClick={toggleSound}
            title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            <span>{soundMuted ? '🔇' : '🔊'}</span>
            <span className="top-btn-label">{soundMuted ? 'Muted' : 'Sound'}</span>
          </button>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="landing-main-stage">
        {/* Left / Top Showcase Column */}
        <section className="landing-hero-showcase">
          {/* Royal Insignia Crest */}
          <motion.div
            className="hero-crest-cluster"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="hero-laurel-wreath">
              <span className="laurel-leaf left">🌿</span>
              <div className="crest-medallion-3d">
                <span className="crest-crown-gold">👑</span>
                <span className="crest-spade-gold">♠</span>
              </div>
              <span className="laurel-leaf right">🌿</span>
            </div>
            
            <h1 className="hero-title-epic">
              <span className="title-letter-gold">B</span>
              <span className="title-letter-gold">H</span>
              <span className="title-letter-gold">A</span>
              <span className="title-letter-gold">B</span>
              <span className="title-letter-gold">H</span>
              <span className="title-letter-gold">I</span>
            </h1>

            <div className="hero-ribbon-tagline">
              <span className="tagline-star">✦</span>
              <span className="tagline-text">THE CLASSIC INDIAN CARD GAME</span>
              <span className="tagline-star">✦</span>
            </div>

            <p className="hero-subtitle-motto">
              Play with 2–8 friends or smart AI bots. Empty your hand, cut tricky suits, and don&apos;t get crowned the Bhabhi!
            </p>
          </motion.div>

          {/* Interactive 3D Fanned Artisan Cards Showcase */}
          <motion.div
            className="hero-cards-fan-stage"
            initial={{ opacity: 0, scale: 0.85, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <div className="cards-fan-halo" />
            <div className="hero-cards-fan-wrap">
              {SHOWCASE_CARDS.map(({ card, rot, y, isCenter }, idx) => (
                <motion.div
                  key={card.id}
                  className={`hero-fan-card-slot ${isCenter ? 'card-hero-center' : ''}`}
                  initial={{ rotate: 0, y: 40, opacity: 0 }}
                  animate={{ rotate: rot, y, opacity: 1 }}
                  whileHover={{
                    scale: 1.14,
                    y: y - 24,
                    zIndex: 25,
                    boxShadow: '0 24px 45px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.9)',
                  }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.1 * idx }}
                >
                  <CardView card={card} size="md" isLegal={isCenter} />
                  {isCenter && (
                    <div className="ace-spade-legend-badge">
                      <span>★ LEADS TRICK 1 ★</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Key Game Features Badges */}
          <div className="hero-features-ribbon">
            <div className="feature-capsule">
              <span className="feature-icon">♠</span>
              <div className="feature-info">
                <span className="feature-title">52 Cards</span>
                <span className="feature-desc">No Trump Suit</span>
              </div>
            </div>
            <div className="feature-capsule">
              <span className="feature-icon">⚡</span>
              <div className="feature-info">
                <span className="feature-title">2–8 Players</span>
                <span className="feature-desc">Real-time Multi</span>
              </div>
            </div>
            <div className="feature-capsule">
              <span className="feature-icon">🤖</span>
              <div className="feature-info">
                <span className="feature-title">Smart Bots</span>
                <span className="feature-desc">Offline Fallbacks</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right / Portal Action Column */}
        <motion.section
          className="landing-portal-column"
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="portal-gold-frame">
            <div className="portal-corner-ornament top-left">⌜</div>
            <div className="portal-corner-ornament top-right">⌝</div>
            <div className="portal-corner-ornament bottom-left">⌞</div>
            <div className="portal-corner-ornament bottom-right">⌟</div>

            <div className="portal-content-card">
              {/* Profile Setup: Avatar & Handle */}
              <div className="portal-profile-section">
                <div className="section-header-row">
                  <span className="section-pill-tag">STEP 1</span>
                  <label htmlFor="landing-name-input" className="portal-section-label">
                    Choose Your Seat & Handle
                  </label>
                </div>

                {/* Avatar Selector Grid */}
                <div className="avatar-selection-row" role="radiogroup" aria-label="Choose avatar">
                  {AVATARS.map(av => (
                    <button
                      key={av.id}
                      type="button"
                      className={`avatar-badge-btn ${selectedAvatar === av.emoji ? 'avatar-active' : ''}`}
                      onClick={() => handleSelectAvatar(av.emoji)}
                      title={av.label}
                    >
                      <span className="avatar-emoji-glyph">{av.emoji}</span>
                      <span className="avatar-label-sub">{av.label}</span>
                    </button>
                  ))}
                </div>

                {/* Name Input Field */}
                <div className="portal-input-container">
                  <div className="input-avatar-prefix">{selectedAvatar}</div>
                  <input
                    id="landing-name-input"
                    type="text"
                    className="portal-text-input"
                    placeholder="Enter your player name (e.g. Vikram)"
                    value={nameInput}
                    maxLength={16}
                    onChange={e => setNameInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Navigation Tabs: Create Table vs Join Table */}
              <div className="portal-action-tabs">
                <button
                  type="button"
                  className={`portal-tab-btn ${activeTab === 'create' ? 'tab-selected' : ''}`}
                  onClick={() => setActiveTab('create')}
                >
                  <span className="tab-icon">👑</span>
                  <span className="tab-label">Create Table</span>
                </button>
                <button
                  type="button"
                  className={`portal-tab-btn ${activeTab === 'join' ? 'tab-selected' : ''}`}
                  onClick={() => setActiveTab('join')}
                >
                  <span className="tab-icon">🎟️</span>
                  <span className="tab-label">Join Room</span>
                </button>
              </div>

              {/* Action Body (Tab Driven) */}
              <div className="portal-tab-body">
                {activeTab === 'create' ? (
                  <motion.div
                    key="tab-create"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="tab-pane-create"
                  >
                    <div className="table-features-list">
                      <div className="table-perk">
                        <span className="perk-bullet">✦</span>
                        <span>Host private table with 5-letter invite code</span>
                      </div>
                      <div className="table-perk">
                        <span className="perk-bullet">✦</span>
                        <span>Add smart AI bots or wait for human friends</span>
                      </div>
                      <div className="table-perk">
                        <span className="perk-bullet">✦</span>
                        <span>Host controls turn time limit (No Limit or 30s-90s)</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-casino-gold-cta"
                      disabled={loading}
                      onClick={handleCreate}
                    >
                      <span className="btn-shine-overlay" />
                      <span className="btn-cta-icon">✦</span>
                      <span className="btn-cta-text">
                        {loading ? 'Entering Table...' : 'HOST PRIVATE TABLE'}
                      </span>
                      <span className="btn-cta-arrow">→</span>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="tab-join"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="tab-pane-join"
                  >
                    <form onSubmit={handleJoin} className="join-form-stack">
                      <label htmlFor="landing-code-input" className="join-input-label">
                        Enter 5-Character Room Code
                      </label>
                      <div className="pin-input-chamber">
                        <input
                          id="landing-code-input"
                          type="text"
                          className="portal-pin-input"
                          placeholder="CODE"
                          maxLength={5}
                          value={codeInput}
                          onChange={e => setCodeInput(e.target.value.toUpperCase())}
                          autoComplete="off"
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-casino-silver-cta"
                        disabled={loading || codeInput.trim().length < 2}
                      >
                        <span className="btn-cta-text">
                          {loading ? 'Joining Arena...' : 'ENTER TABLE'}
                        </span>
                        <span className="btn-cta-arrow">→</span>
                      </button>
                    </form>
                  </motion.div>
                )}
              </div>

              {/* Bottom Quick Rules Link */}
              <div className="portal-footer-strip">
                <button
                  type="button"
                  className="quick-rules-trigger"
                  onClick={() => setShowRules(true)}
                >
                  <span className="rules-icon">📖</span>
                  <span>How to Play Bhabhi (Official Rules)</span>
                  <span className="rules-arrow">↗</span>
                </button>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
};
