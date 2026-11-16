import { create } from 'zustand';
import type {
  ChatMessage,
  GameOverData,
  GameEvent,
  PublicGameState,
  RoomState,
  Seat,
  ToastItem,
} from './types';
import {
  isSoundMuted,
  setSoundMuted,
  playCardSound,
  playCutSound,
  playPickupSound,
  playWinSound,
} from './utils/sound';

export interface HistoryEntry {
  id: string;
  trickNumber: number;
  text: string;
  type: 'play' | 'cut' | 'pickup' | 'win' | 'out';
  timestamp: string;
}

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

  soundMuted: boolean;
  toggleSound: () => void;

  showRules: boolean;
  showHistory: boolean;
  historyLogs: HistoryEntry[];
  showChat: boolean;
  chatMessages: ChatMessage[];
  unreadChatCount: number;
  showCardNumbersOnly: boolean;
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
  setShowHistory: (show: boolean) => void;
  setShowChat: (show: boolean) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setChatHistory: (messages: ChatMessage[]) => void;
  toggleCardNumbersOnly: () => void;
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

  soundMuted: isSoundMuted(),
  toggleSound: () => {
    const next = !get().soundMuted;
    setSoundMuted(next);
    set({ soundMuted: next });
  },

  showRules: false,
  showHistory: false,
  historyLogs: [],
  showChat: false,
  chatMessages: [],
  unreadChatCount: 0,
  showCardNumbersOnly: false,
  errorMessage: null,
  toasts: [],

  setShowChat: (show: boolean) => {
    set({ showChat: show, unreadChatCount: show ? 0 : get().unreadChatCount });
  },

  addChatMessage: (msg: ChatMessage) => {
    const isShowing = get().showChat;
    set(state => ({
      chatMessages: [...state.chatMessages.slice(-59), msg],
      unreadChatCount: isShowing ? 0 : state.unreadChatCount + 1,
    }));
  },

  setChatHistory: (messages: ChatMessage[]) => {
    set({ chatMessages: messages });
  },

  toggleCardNumbersOnly: () => {
    set(state => ({ showCardNumbersOnly: !state.showCardNumbersOnly }));
  },

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
      historyLogs: [],
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
    const roomState = get().roomState;
    const getName = (seat: Seat) => {
      const p = roomState?.players.find(x => x.seat === seat);
      return p ? p.name : `Seat ${seat + 1}`;
    };

    const currentTrick = gameState?.trickNumber || 1;
    const newLogs: HistoryEntry[] = [];

    for (const e of events) {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (e.type === 'CARD_PLAYED') {
        playCardSound();
        newLogs.push({
          id: Math.random().toString(36).substring(2, 9),
          trickNumber: currentTrick,
          text: `${getName(e.seat)} played ${e.card.id}`,
          type: 'play',
          timestamp: nowStr,
        });
      } else if (e.type === 'CUT') {
        playCutSound();
        const msg = `💥 ${getName(e.seat)} cut with ${e.card.id}!`;
        get().addToast(msg, 'cut');
        newLogs.push({
          id: Math.random().toString(36).substring(2, 9),
          trickNumber: currentTrick,
          text: msg,
          type: 'cut',
          timestamp: nowStr,
        });
      } else if (e.type === 'PICKED_UP') {
        playPickupSound();
        const msg = `📥 ${getName(e.seat)} picked up ${e.cards.length} card(s)!`;
        get().addToast(msg, 'pickup');
        newLogs.push({
          id: Math.random().toString(36).substring(2, 9),
          trickNumber: currentTrick,
          text: msg,
          type: 'pickup',
          timestamp: nowStr,
        });
      } else if (e.type === 'TRICK_WON') {
        playWinSound();
        const msg = `🏆 ${getName(e.seat)} won Trick #${currentTrick}!`;
        get().addToast(msg, 'win');
        newLogs.push({
          id: Math.random().toString(36).substring(2, 9),
          trickNumber: currentTrick,
          text: msg,
          type: 'win',
          timestamp: nowStr,
        });
      } else if (e.type === 'PLAYER_OUT') {
        const msg = `🎉 ${getName(e.seat)} is SAFE and OUT (Finish #${e.finishPosition})!`;
        get().addToast(msg, 'out');
        newLogs.push({
          id: Math.random().toString(36).substring(2, 9),
          trickNumber: currentTrick,
          text: msg,
          type: 'out',
          timestamp: nowStr,
        });
      }
    }

    set(state => ({
      gameState,
      legalCardIds,
      lastEvents: events,
      turnDeadline,
      historyLogs: [...state.historyLogs, ...newLogs],
    }));
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
  setShowHistory: (show: boolean) => set({ showHistory: show }),
  setError: (msg: string | null) => set({ errorMessage: msg }),
}));
