import type { Card, GameEvent, PublicGameState, Seat, Suit } from '@bhabhi/engine';

export interface RoomPlayer {
  seat: Seat;
  name: string;
  isBot: boolean;
  connected: boolean;
}

export interface RoomState {
  code: string;
  hostSeat: Seat;
  status: 'waiting' | 'playing' | 'finished';
  turnTimerSeconds?: number;
  players: RoomPlayer[];
}

export interface GameOverData {
  bhabhiSeat: Seat | null;
  isDraw: boolean;
  finishOrder: { seat: Seat; finishPosition: number }[];
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'cut' | 'pickup' | 'out' | 'win';
}

export type { Card, GameEvent, PublicGameState, Seat, Suit };
