import type { Card, GameState, Seat } from './types';

/**
 * Encodes legal moves for a player at their turn according to BHABHI RULES SPEC v1.
 * Cites: S6, T1, T3, T4, T5, T6
 */
export function getLegalMoves(state: GameState, seat: Seat): Card[] {
  // If game is finished or it is not this player's turn, no moves are legal
  if (state.phase === 'finished' || state.turnSeat !== seat) {
    return [];
  }

  const player = state.players[seat];
  if (!player || player.out || player.hand.length === 0) {
    return [];
  }

  // Case 1: Leader's play (first card of the trick)
  if (state.trick.plays.length === 0) {
    // S6. The player holding the Ace of Spades (A♠) leads the first trick and must lead exactly the A♠.
    if (state.trick.isFirstTrick) {
      return player.hand.filter(c => c.suit === 'S' && c.rank === 14);
    }

    // T1. The leader plays one card. Its suit becomes the LED SUIT.
    return [...player.hand];
  }

  // Case 2: Subsequent plays in the trick
  const ledSuit = state.trick.ledSuit;
  if (!ledSuit) {
    return [...player.hand];
  }

  // T3. FOLLOW RULE: if a player holds at least one card of the led suit,
  // they MUST play a card of the led suit (any rank, higher or lower, no obligation to beat).
  const ledSuitCards = player.hand.filter(c => c.suit === ledSuit);
  if (ledSuitCards.length > 0) {
    return ledSuitCards;
  }

  // T4. CUT RULE: if a player holds NO card of the led suit, they MUST play a card of another suit.
  // This is a CUT.
  if (state.trick.isFirstTrick) {
    // T5. FIRST-TRICK CUT RESTRICTION: in the first trick only (the one led by A♠),
    // a player who has no spade may cut only with a card of rank 10 or lower
    // (ranks 2..10, any suit other than spades). Ace, K, Q, J are not allowed.
    const rank10OrLowerCards = player.hand.filter(c => c.rank <= 10);
    if (rank10OrLowerCards.length > 0) {
      return rank10OrLowerCards;
    }

    // T5. If that player holds no card of rank 10 or lower, the restriction is waived
    // and they may cut with any card.
    return [...player.hand];
  }

  // T6. The restriction in T5 does NOT apply to any later trick.
  return [...player.hand];
}
