import type { Card, Rank, Suit } from './types';

export const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/**
 * S1. One standard 52-card deck, no jokers.
 * S2. Rank order 2..14 (Ace is high).
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        id: `${suit}${rank}`,
      });
    }
  }
  return deck;
}

/**
 * Seeded 32-bit PRNG (mulberry32) returning values in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function (): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using an injected seeded RNG function.
 */
export function shuffle<T>(deck: readonly T[], rng: () => number): T[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

/**
 * S4. Deal all 52 cards one at a time clockwise starting from seat 0.
 * If 52 does not divide evenly, seats with lower index get one extra card.
 */
export function deal(deck: readonly Card[], playerCount: number): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < deck.length; i++) {
    const seat = i % playerCount;
    hands[seat]!.push(deck[i]!);
  }
  return hands;
}
