import { create } from 'zustand';
import type { GameOverData, GameEvent, PublicGameState, RoomState, Seat, ToastItem } from './types';

interface AppStore {
  playerName: string;
  roomCode: string | null;
  playerToken: string | null;
  mySeat: Seat | null;

  roomState: RoomState | null;
  gameState: PublicGameState | null;
  legalCardIds: string[];
  lastEvents: GameEvent[];
  turnDeadline: number | undefined;
  gameOver: GameOverData | null;

  showRules: boolean;
  errorMessage: string | null;
  toasts: ToastItem[];

  setPlayerName: (name: string) => void;
  setSession: (code: string, token: string, seat: Seat) => void;
  clearSession: () => void;
  setRoomState: (state: RoomState | null) => void;
  setGameState: (
    gameState: PublicGameState | null,
    legalCardIds: string[],
    events: GameEvent[],
    turnDeadline?: number
  ) => void;
  setGameOver: (data: GameOverData | null) => void;
  addToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;
  setShowRules: (show: boolean) => void;
  setError: (msg: string | null) => void;
}

const LOCAL_NAME_KEY = 'bhabhi_player_name';
const LOCAL_TOKEN_KEY = 'bhabhi_player_token';
const LOCAL_CODE_KEY = 'bhabhi_room_code';
const LOCAL_SEAT_KEY = 'bhabhi_my_seat';

export const useStore = create<AppStore>((set, get) => ({
  playerName: localStorage.getItem(LOCAL_NAME_KEY) || '',
  roomCode: localStorage.getItem(LOCAL_CODE_KEY) || null,
  playerToken: localStorage.getItem(LOCAL_TOKEN_KEY) || null,
  mySeat: localStorage.getItem(LOCAL_SEAT_KEY) !== null
    ? parseInt(localStorage.getItem(LOCAL_SEAT_KEY)!, 10)
    : null,

  roomState: null,
  gameState: null,
  legalCardIds: [],
  lastEvents: [],
  turnDeadline: undefined,
  gameOver: null,

  showRules: false,
  errorMessage: null,
  toasts: [],

  setPlayerName: (name: string) => {
    localStorage.setItem(LOCAL_NAME_KEY, name);
    set({ playerName: name });
  },

  setSession: (code: string, token: string, seat: Seat) => {
    localStorage.setItem(LOCAL_CODE_KEY, code);
    localStorage.setItem(LOCAL_TOKEN_KEY, token);
    localStorage.setItem(LOCAL_SEAT_KEY, String(seat));
    set({ roomCode: code, playerToken: token, mySeat: seat });
  },

  clearSession: () => {
    localStorage.removeItem(LOCAL_CODE_KEY);
    localStorage.removeItem(LOCAL_TOKEN_KEY);
    localStorage.removeItem(LOCAL_SEAT_KEY);
    set({
      roomCode: null,
      playerToken: null,
      mySeat: null,
      roomState: null,
      gameState: null,
      legalCardIds: [],
      gameOver: null,
    });
  },

  setRoomState: (state: RoomState | null) => {
    set({ roomState: state });
  },

  setGameState: (
    gameState: PublicGameState | null,
    legalCardIds: string[],
    events: GameEvent[],
    turnDeadline?: number
  ) => {
    // Process new events into toasts
    const roomState = get().roomState;
    const getName = (seat: Seat) => {
      const p = roomState?.players.find(x => x.seat === seat);
      return p ? p.name : `Seat ${seat}`;
    };

    for (const e of events) {
      if (e.type === 'CUT') {
        get().addToast(`💥 ${getName(e.seat)} cut the trick!`, 'cut');
      } else if (e.type === 'PICKED_UP') {
        get().addToast(`📥 ${getName(e.seat)} picks up ${e.cards.length} card(s)!`, 'pickup');
      } else if (e.type === 'TRICK_WON') {
        get().addToast(`🏆 ${getName(e.seat)} won the trick!`, 'win');
      } else if (e.type === 'PLAYER_OUT') {
        get().addToast(`🎉 ${getName(e.seat)} is safe and OUT (#${e.finishPosition})!`, 'out');
      }
    }

    set({
      gameState,
      legalCardIds,
      lastEvents: events,
      turnDeadline,
    });
  },

  setGameOver: (data: GameOverData | null) => {
    set({ gameOver: data });
  },

  addToast: (message: string, type: ToastItem['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set(state => ({
      toasts: [...state.toasts.slice(-4), { id, message, type }],
    }));

    setTimeout(() => {
      get().removeToast(id);
    }, 4500);
  },

  removeToast: (id: string) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }));
  },

  setShowRules: (show: boolean) => set({ showRules: show }),
  setError: (msg: string | null) => set({ errorMessage: msg }),
}));
