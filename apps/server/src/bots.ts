import { Card, GameState, Seat } from '@bhabhi/engine';

/**
 * Bot strategy for Bhabhi:
 * - When cutting: choose the highest-ranked card that is legal.
 * - When following suit: follow suit with the highest card it can safely play
 *   if it does not win more than needed (play highest safe card below trick leader/highest,
 *   or lowest winning card if all cards exceed it).
 * - Otherwise: random legal.
 */
export function chooseBotMove(state: GameState, seat: Seat, legalMoves: Card[]): Card {
  if (legalMoves.length === 0) {
    throw new Error(`Bot at seat ${seat} has no legal moves.`);
  }

  if (legalMoves.length === 1) {
    return legalMoves[0]!;
  }

  const trick = state.trick;
  const isLeader = trick.plays.length === 0;

  // If leader, choose lowest card to avoid taking high-rank risks
  if (isLeader) {
    return legalMoves.reduce((min, c) => (c.rank < min.rank ? c : min), legalMoves[0]!);
  }

  const ledSuit = trick.ledSuit;
  const isCutting = ledSuit ? legalMoves.every(c => c.suit !== ledSuit) : false;

  // When cutting: choose the highest-ranked card that is legal
  if (isCutting) {
    return legalMoves.reduce((max, c) => (c.rank > max.rank ? c : max), legalMoves[0]!);
  }

  // When following suit
  if (ledSuit && legalMoves.some(c => c.suit === ledSuit)) {
    const ledPlays = trick.plays.filter(p => p.card.suit === ledSuit);
    const highestLedRank = Math.max(...ledPlays.map(p => p.card.rank));

    // Cards of led suit that are lower than current highest
    const safeCards = legalMoves.filter(c => c.suit === ledSuit && c.rank < highestLedRank);
    if (safeCards.length > 0) {
      // Highest safe card to dump without winning the trick
      return safeCards.reduce((max, c) => (c.rank > max.rank ? c : max), safeCards[0]!);
    }

    // All our cards will win the trick: play lowest winning card
    const winningCards = legalMoves.filter(c => c.suit === ledSuit && c.rank > highestLedRank);
    if (winningCards.length > 0) {
      return winningCards.reduce((min, c) => (c.rank < min.rank ? c : min), winningCards[0]!);
    }
  }

  // Otherwise: random legal
  return legalMoves[Math.floor(Math.random() * legalMoves.length)]!;
}
