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
      className={`luxury-card card-${size} ${isRed ? 'card-red' : 'card-black'} ${
        isLegal ? 'card-legal' : ''
      } ${disabled ? 'card-disabled' : ''} ${className}`}
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
              y: (isFanned ? fanTranslateY : 0) - 26,
              scale: 1.1,
              zIndex: 90,
              boxShadow: '0 16px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 175, 40, 0.8)',
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
      {/* Decorative Inner Border */}
      <div className="card-inner-frame">
        {/* Top-Left Corner Index */}
        <div className="card-index card-top-left">
          <span className="card-rank">{rankStr}</span>
          <span className="card-suit-pip">{symbol}</span>
        </div>

        {/* Center Artwork */}
        <div className="card-artwork">
          {isAceOfSpades ? (
            <div className="ace-spades-seal">
              <span className="ace-ornament-top">✦</span>
              <span className="ace-main-spade">♠</span>
              <span className="ace-label">BHABHI</span>
            </div>
          ) : isFaceCard ? (
            <div className="face-card-seal">
              <span className="face-card-crown">♔</span>
              <span className="face-suit-icon">{symbol}</span>
              <span className="face-rank-tag">{rankStr}</span>
            </div>
          ) : (
            <div className="pip-center-pattern">
              <span className="pip-center-icon">{symbol}</span>
            </div>
          )}
        </div>

        {/* Bottom-Right Corner Index (Inverted) */}
        <div className="card-index card-bottom-right">
          <span className="card-rank">{rankStr}</span>
          <span className="card-suit-pip">{symbol}</span>
        </div>
      </div>
    </motion.div>
  );
};
