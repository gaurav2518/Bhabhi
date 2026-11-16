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

  return (
    <motion.div
      layoutId={`card-${card.id}`}
      className={`playing-card card-${size} ${isRed ? 'card-red' : 'card-black'} ${
        isLegal ? 'card-legal' : ''
      } ${disabled ? 'card-disabled' : ''} ${className}`}
      style={{
        transformOrigin: 'bottom center',
      }}
      animate={
        isFanned
          ? {
              rotate: fanRotation,
              y: fanTranslateY,
              transition: { type: 'spring', stiffness: 300, damping: 25 },
            }
          : undefined
      }
      whileHover={
        isLegal && !disabled
          ? {
              scale: 1.12,
              y: fanTranslateY - 24,
              zIndex: 50,
              boxShadow: '0 12px 24px rgba(0, 0, 0, 0.45)',
            }
          : undefined
      }
      whileTap={isLegal && !disabled ? { scale: 0.95 } : undefined}
      onClick={() => {
        if (isLegal && !disabled && onClick) {
          onClick();
        }
      }}
    >
      <div className="card-corner card-top-left">
        <span className="card-rank">{rankStr}</span>
        <span className="card-suit">{symbol}</span>
      </div>

      <div className="card-center">
        <span className="card-center-suit">{symbol}</span>
      </div>

      <div className="card-corner card-bottom-right">
        <span className="card-rank">{rankStr}</span>
        <span className="card-suit">{symbol}</span>
      </div>
    </motion.div>
  );
};
