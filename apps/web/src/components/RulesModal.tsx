import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop-luxury" onClick={onClose}>
          <motion.div
            className="rules-modal-panel"
            initial={{ opacity: 0, scale: 0.92, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 25 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="rules-modal-header">
              <div className="header-title-box">
                <span className="gold-sparkle">✦</span>
                <h2>BHABHI RULES HANDBOOK</h2>
                <span className="spec-badge">Spec v1</span>
              </div>
              <button className="modal-close-btn" onClick={onClose}>
                ✕
              </button>
            </div>

            <div className="rules-modal-body">
              <div className="rule-card">
                <div className="rule-card-header">
                  <span className="rule-icon">🃏</span>
                  <h4>1. SETUP & RANKS</h4>
                </div>
                <ul>
                  <li><strong>S1–S3:</strong> 2 to 8 players. Standard 52-card deck (no jokers). Rank order: <strong>2 low $\dots$ Ace high</strong>. No trump suits.</li>
                  <li><strong>S4–S5:</strong> All 52 cards are dealt clockwise from Seat 0. Extras go to lower seat numbers.</li>
                  <li><strong>S6 (Opening Lead):</strong> The player holding the <strong>Ace of Spades (A♠)</strong> MUST lead the first trick and must play A♠.</li>
                </ul>
              </div>

              <div className="rule-card">
                <div className="rule-card-header">
                  <span className="rule-icon">⚔️</span>
                  <h4>2. TRICK FLOW</h4>
                </div>
                <ul>
                  <li><strong>T1–T2:</strong> Leader sets the led suit; remaining active players play 1 card clockwise.</li>
                  <li><strong>T3 (Follow Rule):</strong> If you hold any card of the led suit, you <strong>MUST follow suit</strong>.</li>
                  <li><strong>T4 (Cut Rule):</strong> If you hold NO card of the led suit, you <strong>MUST cut</strong> with another suit. A cut <strong>terminates the trick immediately</strong>!</li>
                  <li><strong>T5 (First-Trick Restriction):</strong> On the A♠ opening trick, a cut card must be rank <strong>10 or lower</strong>. If you hold only cards &gt; 10, the restriction is waived.</li>
                </ul>
              </div>

              <div className="rule-card">
                <div className="rule-card-header">
                  <span className="rule-icon">⚖️</span>
                  <h4>3. RESOLUTION & PICKUPS</h4>
                </div>
                <ul>
                  <li><strong>R1 (No Cut):</strong> If everyone follows suit, the highest card of the led suit wins. All cards are <strong>permanently discarded</strong>. Winner leads next trick.</li>
                  <li><strong>R2–R3 (Cut Occurred):</strong> The player who played the highest card of the led suit so far picks up <strong>ALL cards</strong> in the trick (including the cut card). That player leads next!</li>
                </ul>
              </div>

              <div className="rule-card">
                <div className="rule-card-header">
                  <span className="rule-icon">🏆</span>
                  <h4>4. ELIMINATION & BHABHI</h4>
                </div>
                <ul>
                  <li><strong>E1–E5:</strong> A player is safe (eliminated) <strong>only after a trick fully resolves</strong> with an empty hand. Pickup players take cards and are not safe!</li>
                  <li><strong>E6:</strong> If the trick winner empties their hand and is eliminated, the lead passes clockwise to the next active player.</li>
                  <li><strong>G1–G2:</strong> The last remaining player holding cards is the <strong>BHABHI</strong> (the loser).</li>
                  <li><strong>G3:</strong> If the last players empty their hands together in the same trick, the game ends in an honorable <strong>DRAW</strong>.</li>
                  <li><strong>M1:</strong> 30 seconds per turn. On timeout, the lowest-rank legal card is auto-played.</li>
                </ul>
              </div>
            </div>

            <div className="rules-modal-footer">
              <button className="btn-gold-action btn-sm" onClick={onClose}>
                Understood, Let's Play!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
