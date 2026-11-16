// ============================================================================
// BHABHI RULES SPEC v1 - TYPES
// ============================================================================

// S2. Rank order low to high: 2,3,4,5,6,7,8,9,10,J,Q,K,A. Ace is always high (14).
export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "S14"
}

// S5. Seats are numbered 0..n-1 clockwise.
export type Seat = number;

export interface TrickPlay {
  seat: Seat;
  card: Card;
}

export interface Trick {
  leaderSeat: Seat;
  ledSuit: Suit | null;
  plays: TrickPlay[];
  isFirstTrick: boolean;
}

export interface PlayerState {
  seat: Seat;
  hand: Card[];
  out: boolean;
  finishPosition: number | null;
}

export interface GameState {
  players: PlayerState[];
  turnSeat: Seat;
  trick: Trick;
  discard: Card[];
  phase: 'playing' | 'finished';
  bhabhiSeat: Seat | null;
  isDraw: boolean;
  trickNumber: number;
  finishCounter: number;
}

export type GameEvent =
  | { type: 'CARD_PLAYED'; seat: Seat; card: Card }
  | { type: 'CUT'; seat: Seat; card: Card }
  | { type: 'TRICK_WON'; seat: Seat; cards: Card[] }
  | { type: 'PICKED_UP'; seat: Seat; cards: Card[] }
  | { type: 'PLAYER_OUT'; seat: Seat; finishPosition: number }
  | { type: 'GAME_OVER'; bhabhiSeat: Seat | null; isDraw: boolean };

export interface PublicPlayerState {
  seat: Seat;
  handSize: number;
  hand?: Card[];
  out: boolean;
  finishPosition: number | null;
}

export interface PublicGameState {
  players: PublicPlayerState[];
  turnSeat: Seat;
  trick: Trick;
  discard: Card[];
  discardCount: number;
  phase: 'playing' | 'finished';
  bhabhiSeat: Seat | null;
  isDraw: boolean;
  trickNumber: number;
  finishCounter: number;
}

export class IllegalMoveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalMoveError';
  }
}
