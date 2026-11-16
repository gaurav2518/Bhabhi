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
        <div className="modal-overlay" onClick={onClose}>
          <motion.div
            className="modal-card rules-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>📖 Bhabhi Rules (Spec v1)</h2>
              <button className="btn-close" onClick={onClose}>
                ✕
              </button>
            </div>

            <div className="modal-body rules-content">
              <section>
                <h3>Setup</h3>
                <ul>
                  <li><strong>S1–S3:</strong> 2 to 8 players, standard 52 cards (2 low, Ace high). No trump suit.</li>
                  <li><strong>S4–S5:</strong> Deal cards clockwise from Seat 0. Turn order proceeds clockwise, skipping eliminated players.</li>
                  <li><strong>S6:</strong> The player holding the <strong>Ace of Spades (A♠)</strong> leads the very first trick and must play A♠.</li>
                </ul>
              </section>

              <section>
                <h3>Trick Flow</h3>
                <ul>
                  <li><strong>T1–T2:</strong> Leader sets the led suit; active players follow clockwise.</li>
                  <li><strong>T3 (Follow Rule):</strong> If you hold any card of the led suit, you <strong>must</strong> follow suit.</li>
                  <li><strong>T4 (Cut Rule):</strong> If you have NO card of the led suit, you must cut with another suit. A cut <strong>ends the trick immediately</strong>!</li>
                  <li><strong>T5 (First Trick Restriction):</strong> On the A♠ first trick, a cut must be rank <strong>10 or lower</strong> (ranks 2..10). Waived only if you hold no cards &le; 10.</li>
                  <li><strong>T6:</strong> The restriction is lifted from trick 2 onwards (any rank can cut).</li>
                </ul>
              </section>

              <section>
                <h3>Trick Resolution</h3>
                <ul>
                  <li><strong>R1 (No Cut):</strong> Highest card of led suit wins; cards are discarded permanently. Winner leads next.</li>
                  <li><strong>R2–R3 (Cut Occurred):</strong> The player who played the highest card of the led suit picks up all cards played in the trick (including the cut). That player leads next.</li>
                </ul>
              </section>

              <section>
                <h3>Elimination & End of Game</h3>
                <ul>
                  <li><strong>E1–E5:</strong> A player is eliminated (SAFE) only after a trick fully resolves with an empty hand. Pickup players take cards and are not out!</li>
                  <li><strong>E6:</strong> If the trick winner empties their hand and is eliminated, the lead passes clockwise to the next active player.</li>
                  <li><strong>G1–G2:</strong> The last remaining player holding cards is the <strong>BHABHI</strong> (the loser).</li>
                  <li><strong>G3–G4:</strong> If the last active players empty their hands together, the game ends in a <strong>DRAW</strong>.</li>
                </ul>
              </section>

              <section>
                <h3>Timer</h3>
                <ul>
                  <li><strong>M1:</strong> 30 seconds per turn. If time expires, the lowest-rank legal card is automatically played.</li>
                </ul>
              </section>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={onClose}>
                Got It!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
