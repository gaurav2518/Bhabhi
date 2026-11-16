import React from 'react';
import { motion } from 'framer-motion';
import type { Card, Suit } from '../types';

interface CardViewProps {
  card: Card;
  isLegal?: boolean;
  disabled?: boolean;
  isFanned?: boolean;
  fanRotation?: number;
  fanTranslateY?: number;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

const RANK_LABELS: Record<number, string> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  isLegal = false,
  disabled = false,
  isFanned = false,
  fanRotation = 0,
  fanTranslateY = 0,
  onClick,
  className = '',
  size = 'md',
}) => {
  const isRed = card.suit === 'H' || card.suit === 'D';
  const symbol = SUIT_SYMBOLS[card.suit];
  const rankStr = RANK_LABELS[card.rank] ?? String(card.rank);
  const isAceOfSpades = card.id === 'S14';
  const isFaceCard = card.rank >= 11 && card.rank <= 13;

  return (
    <motion.div
      layoutId={`card-${card.id}`}
      className={`artisan-card card-${size} ${isRed ? 'card-crimson' : 'card-onyx'} ${
        isLegal ? 'card-playable' : ''
      } ${disabled ? 'card-dimmed' : ''} ${className}`}
      style={{
        transformOrigin: '50% 100%',
      }}
      animate={
        isFanned
          ? {
              rotate: fanRotation,
              y: fanTranslateY,
              transition: { type: 'spring', stiffness: 350, damping: 28 },
            }
          : undefined
      }
      whileHover={
        isLegal && !disabled
          ? {
              y: (isFanned ? fanTranslateY : 0) - 28,
              scale: 1.09,
              zIndex: 99,
              boxShadow: '0 20px 35px rgba(0, 0, 0, 0.65), 0 0 22px rgba(212, 175, 55, 0.85)',
            }
          : undefined
      }
      whileTap={isLegal && !disabled ? { scale: 0.96 } : undefined}
      onClick={() => {
        if (isLegal && !disabled && onClick) {
          onClick();
        }
      }}
    >
      {/* Outer Ivory Border & Inner Gold Inlay Hairline */}
      <div className="artisan-inner-frame">
        {/* Top-Left Index (Rank & Suit) */}
        <div className="artisan-index index-top-left">
          <span className="artisan-rank">{rankStr}</span>
          <span className="artisan-suit-pip">{symbol}</span>
        </div>

        {/* Center Artwork — Theory11 Inspired */}
        <div className="artisan-center-art">
          {isAceOfSpades ? (
            /* Artisan Iconic Ace of Spades Filigree */
            <div className="artisan-ace-masterpiece">
              <div className="ace-sunburst-aura" />
              <div className="ace-baroque-spade">
                <span className="spade-glyph">♠</span>
                <div className="ace-seal-overlay">
                  <span className="seal-star">✦</span>
                  <span className="seal-text">ARTISAN</span>
                  <span className="seal-edition">BHABHI</span>
                </div>
              </div>
            </div>
          ) : isFaceCard ? (
            /* Court Face Cards (J, Q, K) Royal Heraldic Medallion */
            <div className="artisan-court-medallion">
              <div className="court-frame-gold">
                <span className="court-crown-icon">♔</span>
                <span className="court-suit-icon">{symbol}</span>
                <span className="court-rank-name">{rankStr === 'K' ? 'KING' : rankStr === 'Q' ? 'QUEEN' : 'JACK'}</span>
              </div>
            </div>
          ) : (
            /* Number Cards Classic Central Pip */
            <div className="artisan-pip-cluster">
              <span className="pip-symbol-hero">{symbol}</span>
            </div>
          )}
        </div>

        {/* Bottom-Right Inverted Index */}
        <div className="artisan-index index-bottom-right">
          <span className="artisan-rank">{rankStr}</span>
          <span className="artisan-suit-pip">{symbol}</span>
        </div>
      </div>
    </motion.div>
  );
};
