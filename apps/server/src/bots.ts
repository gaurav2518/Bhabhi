import { Card, GameState, Seat } from '@bhabhi/engine';

/**
 * Enhanced Strategic Bot for Bhabhi:
 * - When leading:
 *   1. Identifies which active opponents are known to be void in which suits (burned/cut suits).
 *   2. Never leads a suit where an active opponent is void (to avoid being given THOLA!).
 *   3. Among safe suits, prefers the suit with the most cards (to safely exhaust long suits),
 *      and plays the lowest-rank card of that suit.
 *   4. Only leads a dangerous/void suit if it has NO other suit in hand.
 * - When following suit:
 *   - Follows suit with the highest safe card that does not win the trick unnecessarily,
 *   - Or lowest winning card if all cards exceed the current highest.
 * - When cutting (giving THOLA):
 *   - Chooses the highest-ranked card to dump unwanted high cards onto the victim!
 */
export function chooseBotMove(
  state: GameState,
  seat: Seat,
  legalMoves: Card[],
  knownVoids?: Map<Seat, Set<string>>
): Card {
  if (legalMoves.length === 0) {
    throw new Error(`Bot at seat ${seat} has no legal moves.`);
  }

  if (legalMoves.length === 1) {
    return legalMoves[0]!;
  }

  const trick = state.trick;
  const isLeader = trick.plays.length === 0;

  // Strategic Leading
  if (isLeader) {
    // Other active opponents still playing
    const activeOpponents = state.players.filter(p => !p.out && p.seat !== seat);

    // Collect all suits where any currently active opponent is known to be void
    const dangerousSuits = new Set<string>();
    if (knownVoids) {
      for (const opp of activeOpponents) {
        const oppVoids = knownVoids.get(opp.seat);
        if (oppVoids) {
          for (const s of oppVoids) {
            dangerousSuits.add(s);
          }
        }
      }
    }

    // Filter out moves in dangerous suits (suits where an opponent will cut/Thola us)
    const safeMoves = legalMoves.filter(c => !dangerousSuits.has(c.suit));

    // If we have safe suits where opponents can follow, prioritize them!
    const candidateMoves = safeMoves.length > 0 ? safeMoves : legalMoves;

    // Count how many cards the bot holds in each candidate suit
    const suitCounts = new Map<string, number>();
    for (const c of candidateMoves) {
      suitCounts.set(c.suit, (suitCounts.get(c.suit) || 0) + 1);
    }

    // Prefer leading from suits where the bot has the most cards (to clear its hand),
    // and play the lowest-rank card in that suit.
    return candidateMoves.reduce((best, c) => {
      const bestCount = suitCounts.get(best.suit) || 0;
      const cCount = suitCounts.get(c.suit) || 0;
      if (cCount !== bestCount) {
        return cCount > bestCount ? c : best;
      }
      return c.rank < best.rank ? c : best;
    }, candidateMoves[0]!);
  }

  const ledSuit = trick.ledSuit;
  const isCutting = ledSuit ? legalMoves.every(c => c.suit !== ledSuit) : false;

  // When cutting (Thola): choose highest-ranked legal card to dump onto the trick leader
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

  // Fallback: lowest card
  return legalMoves.reduce((min, c) => (c.rank < min.rank ? c : min), legalMoves[0]!);
}
