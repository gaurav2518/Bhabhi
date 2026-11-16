import http from 'node:http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { customAlphabet, nanoid } from 'nanoid';
import {
  applyMove,
  Card,
  createGame,
  GameEvent,
  GameState,
  getLegalMoves,
  getPublicView,
  IllegalMoveError,
  Seat,
} from '@bhabhi/engine';
import { chooseBotMove } from './bots';

const PORT = 3001;
const CLIENT_ORIGIN = 'http://localhost:5173';
const TURN_TIMEOUT_MS = 30_000;
const BOT_DELAY_MS = 700;
const RECONNECT_HOLD_MS = 120_000;
const EMPTY_ROOM_CLEANUP_MS = 10 * 60 * 1000; // 10 minutes

// 5-character uppercase code without 0, O, 1, I
const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const generateRoomCode = customAlphabet(ROOM_CODE_ALPHABET, 5);

interface RoomPlayer {
  seat: Seat;
  name: string;
  isBot: boolean;
  connected: boolean;
  token: string;
  socketId: string | null;
  disconnectTimeout?: NodeJS.Timeout;
}

interface Room {
  code: string;
  hostSeat: Seat;
  status: 'waiting' | 'playing' | 'finished';
  players: RoomPlayer[];
  gameState: GameState | null;
  lastEvents: GameEvent[];
  turnTimer?: NodeJS.Timeout;
  turnDeadline?: number;
  botTurnTimer?: NodeJS.Timeout;
  emptyCleanupTimer?: NodeJS.Timeout;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, { code: string; token: string }>();

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

function getRoomStatePayload(room: Room) {
  return {
    code: room.code,
    hostSeat: room.hostSeat,
    status: room.status,
    players: room.players.map(p => ({
      seat: p.seat,
      name: p.name,
      isBot: p.isBot,
      connected: p.connected,
    })),
  };
}

function broadcastRoomState(room: Room) {
  io.to(room.code).emit('room:state', getRoomStatePayload(room));
}

function broadcastGameState(room: Room) {
  if (!room.gameState) return;

  for (const player of room.players) {
    if (player.socketId) {
      const publicView = getPublicView(room.gameState, player.seat);
      const isMyTurn = room.gameState.turnSeat === player.seat && !player.isBot;
      const legalCardIds = isMyTurn
        ? getLegalMoves(room.gameState, player.seat).map(c => c.id)
        : [];

      io.to(player.socketId).emit('game:state', {
        gameState: publicView,
        legalCardIds,
        events: room.lastEvents,
        turnDeadline: room.turnDeadline,
      });
    }
  }

  // If spectators or connected sockets without seats exist
  io.to(room.code).except(room.players.filter(p => !!p.socketId).map(p => p.socketId!)).emit('game:state', {
    gameState: getPublicView(room.gameState, null),
    legalCardIds: [],
    events: room.lastEvents,
    turnDeadline: room.turnDeadline,
  });
}

function broadcastGameOver(room: Room) {
  if (!room.gameState) return;

  const finishOrder = room.gameState.players
    .filter(p => p.finishPosition !== null)
    .map(p => ({ seat: p.seat, finishPosition: p.finishPosition! }));

  io.to(room.code).emit('game:over', {
    bhabhiSeat: room.gameState.bhabhiSeat,
    isDraw: room.gameState.isDraw,
    finishOrder,
  });
}

function clearRoomTimers(room: Room) {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = undefined;
  }
  if (room.botTurnTimer) {
    clearTimeout(room.botTurnTimer);
    room.botTurnTimer = undefined;
  }
}

function checkEmptyRoom(room: Room) {
  const hasHumanConnected = room.players.some(p => !p.isBot && p.connected);
  if (!hasHumanConnected && !room.emptyCleanupTimer) {
    room.emptyCleanupTimer = setTimeout(() => {
      clearRoomTimers(room);
      for (const p of room.players) {
        if (p.disconnectTimeout) clearTimeout(p.disconnectTimeout);
      }
      rooms.delete(room.code);
    }, EMPTY_ROOM_CLEANUP_MS);
  } else if (hasHumanConnected && room.emptyCleanupTimer) {
    clearTimeout(room.emptyCleanupTimer);
    room.emptyCleanupTimer = undefined;
  }
}

function triggerTurn(room: Room) {
  clearRoomTimers(room);

  if (!room.gameState || room.gameState.phase === 'finished') {
    room.status = 'finished';
    broadcastRoomState(room);
    broadcastGameOver(room);
    return;
  }

  const turnSeat = room.gameState.turnSeat;
  const player = room.players[turnSeat];
  if (!player) return;

  room.turnDeadline = Date.now() + TURN_TIMEOUT_MS;

  if (player.isBot) {
    // Bot plays after 700ms
    room.botTurnTimer = setTimeout(() => {
      executeBotMove(room, turnSeat);
    }, BOT_DELAY_MS);
  } else if (!player.connected) {
    // Disconnected player: bot plays on turn timeout (30s)
    room.turnTimer = setTimeout(() => {
      executeTimeoutMove(room, turnSeat);
    }, TURN_TIMEOUT_MS);
  } else {
    // Connected human: turn timer 30s
    room.turnTimer = setTimeout(() => {
      executeTimeoutMove(room, turnSeat);
    }, TURN_TIMEOUT_MS);
  }

  broadcastGameState(room);
}

function executeMove(room: Room, seat: Seat, cardId: string) {
  if (!room.gameState) return;

  const result = applyMove(room.gameState, seat, cardId);
  room.gameState = result.state;
  room.lastEvents = result.events;

  if (room.gameState.phase === 'finished') {
    room.status = 'finished';
    clearRoomTimers(room);
    broadcastGameState(room);
    broadcastRoomState(room);
    broadcastGameOver(room);
  } else {
    triggerTurn(room);
  }
}

function executeBotMove(room: Room, seat: Seat) {
  if (!room.gameState || room.gameState.phase === 'finished') return;
  if (room.gameState.turnSeat !== seat) return;

  const legal = getLegalMoves(room.gameState, seat);
  if (legal.length === 0) return;

  const chosen = chooseBotMove(room.gameState, seat, legal);
  executeMove(room, seat, chosen.id);
}

function executeTimeoutMove(room: Room, seat: Seat) {
  if (!room.gameState || room.gameState.phase === 'finished') return;
  if (room.gameState.turnSeat !== seat) return;

  const legal = getLegalMoves(room.gameState, seat);
  if (legal.length === 0) return;

  // M1: on timeout play the lowest-rank legal card
  const lowestCard = legal.reduce((min, c) => (c.rank < min.rank ? c : min), legal[0]!);
  executeMove(room, seat, lowestCard.id);
}

io.on('connection', (socket: Socket) => {
  // room:create { name }
  socket.on('room:create', (payload: { name?: string }, callback?: (res: any) => void) => {
    let code = generateRoomCode();
    while (rooms.has(code)) {
      code = generateRoomCode();
    }

    const token = nanoid(24);
    const hostPlayer: RoomPlayer = {
      seat: 0,
      name: payload?.name?.trim() || 'Player 1',
      isBot: false,
      connected: true,
      token,
      socketId: socket.id,
    };

    const room: Room = {
      code,
      hostSeat: 0,
      status: 'waiting',
      players: [hostPlayer],
      gameState: null,
      lastEvents: [],
    };

    rooms.set(code, room);
    socketToRoom.set(socket.id, { code, token });
    socket.join(code);

    const response = { ok: true, code, token, seat: 0 };
    if (typeof callback === 'function') callback(response);
    socket.emit('room:created', response);
    broadcastRoomState(room);
  });

  // room:join { code, name, token }
  socket.on('room:join', (payload: { code: string; name?: string; token?: string }, callback?: (res: any) => void) => {
    const code = payload?.code?.trim()?.toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      const err = { ok: false, error: 'Room not found' };
      if (typeof callback === 'function') callback(err);
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Reconnection via token
    if (payload.token) {
      const existingPlayer = room.players.find(p => p.token === payload.token);
      if (existingPlayer) {
        if (existingPlayer.disconnectTimeout) {
          clearTimeout(existingPlayer.disconnectTimeout);
          existingPlayer.disconnectTimeout = undefined;
        }

        existingPlayer.connected = true;
        existingPlayer.socketId = socket.id;
        socketToRoom.set(socket.id, { code, token: existingPlayer.token });
        socket.join(code);
        checkEmptyRoom(room);

        const res = { ok: true, code, token: existingPlayer.token, seat: existingPlayer.seat };
        if (typeof callback === 'function') callback(res);
        socket.emit('room:joined', res);

        broadcastRoomState(room);
        if (room.status === 'playing' && room.gameState) {
          broadcastGameState(room);
        }
        return;
      }
    }

    // New join
    if (room.status !== 'waiting') {
      const err = { ok: false, error: 'Game already in progress' };
      if (typeof callback === 'function') callback(err);
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    if (room.players.length >= 8) {
      const err = { ok: false, error: 'Room is full (max 8 players)' };
      if (typeof callback === 'function') callback(err);
      socket.emit('error', { message: 'Room is full (max 8 players)' });
      return;
    }

    const seat = room.players.length as Seat;
    const token = nanoid(24);
    const newPlayer: RoomPlayer = {
      seat,
      name: payload?.name?.trim() || `Player ${seat + 1}`,
      isBot: false,
      connected: true,
      token,
      socketId: socket.id,
    };

    room.players.push(newPlayer);
    socketToRoom.set(socket.id, { code, token });
    socket.join(code);
    checkEmptyRoom(room);

    const res = { ok: true, code, token, seat };
    if (typeof callback === 'function') callback(res);
    socket.emit('room:joined', res);

    broadcastRoomState(room);
  });

  // room:addBot
  socket.on('room:addBot', (_payload: unknown, callback?: (res: any) => void) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.code);
    if (!room) return;

    const caller = room.players.find(p => p.token === meta.token);
    if (!caller || caller.seat !== room.hostSeat) {
      socket.emit('error', { message: 'Only the host can add bots' });
      if (typeof callback === 'function') callback({ ok: false, error: 'Only host can add bots' });
      return;
    }

    if (room.status !== 'waiting') {
      socket.emit('error', { message: 'Cannot add bots after game has started' });
      if (typeof callback === 'function') callback({ ok: false, error: 'Game already started' });
      return;
    }

    if (room.players.length >= 8) {
      socket.emit('error', { message: 'Room is full (max 8 players)' });
      if (typeof callback === 'function') callback({ ok: false, error: 'Room is full' });
      return;
    }

    const seat = room.players.length as Seat;
    const botPlayer: RoomPlayer = {
      seat,
      name: `Bot ${seat + 1}`,
      isBot: true,
      connected: true,
      token: '',
      socketId: null,
    };

    room.players.push(botPlayer);
    broadcastRoomState(room);
    if (typeof callback === 'function') callback({ ok: true });
  });

  // room:removeBot { seat }
  socket.on('room:removeBot', (payload: { seat: number }, callback?: (res: any) => void) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.code);
    if (!room) return;

    const caller = room.players.find(p => p.token === meta.token);
    if (!caller || caller.seat !== room.hostSeat) {
      socket.emit('error', { message: 'Only the host can remove bots' });
      if (typeof callback === 'function') callback({ ok: false, error: 'Only host can remove bots' });
      return;
    }

    if (room.status !== 'waiting') {
      socket.emit('error', { message: 'Cannot remove bots after game has started' });
      if (typeof callback === 'function') callback({ ok: false, error: 'Game already started' });
      return;
    }

    const botIndex = room.players.findIndex(p => p.seat === payload?.seat && p.isBot);
    if (botIndex === -1) {
      socket.emit('error', { message: 'Target seat is not a bot' });
      if (typeof callback === 'function') callback({ ok: false, error: 'Target seat is not a bot' });
      return;
    }

    room.players.splice(botIndex, 1);
    room.players.forEach((p, idx) => {
      p.seat = idx;
    });

    broadcastRoomState(room);
    if (typeof callback === 'function') callback({ ok: true });
  });

  // room:start
  socket.on('room:start', (_payload: unknown, callback?: (res: any) => void) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.code);
    if (!room) return;

    const caller = room.players.find(p => p.token === meta.token);
    if (!caller || caller.seat !== room.hostSeat) {
      socket.emit('error', { message: 'Only the host can start the game' });
      if (typeof callback === 'function') callback({ ok: false, error: 'Only host can start game' });
      return;
    }

    if (room.status !== 'waiting') {
      socket.emit('error', { message: 'Game has already started' });
      if (typeof callback === 'function') callback({ ok: false, error: 'Game already started' });
      return;
    }

    if (room.players.length < 2 || room.players.length > 8) {
      socket.emit('error', { message: 'Game requires 2 to 8 players to start' });
      if (typeof callback === 'function') callback({ ok: false, error: 'Requires 2..8 players' });
      return;
    }

    room.gameState = createGame(room.players.length, Date.now());
    room.status = 'playing';
    room.lastEvents = [];

    broadcastRoomState(room);
    triggerTurn(room);

    if (typeof callback === 'function') callback({ ok: true });
  });

  // game:play { cardId }
  socket.on('game:play', (payload: { cardId: string }, callback?: (res: any) => void) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }
    const room = rooms.get(meta.code);
    if (!room || !room.gameState || room.status !== 'playing') {
      socket.emit('error', { message: 'No active game' });
      return;
    }

    const player = room.players.find(p => p.token === meta.token);
    if (!player) {
      socket.emit('error', { message: 'Player not found in room' });
      return;
    }

    if (room.gameState.turnSeat !== player.seat) {
      socket.emit('error', { message: `Not your turn (current turn: Seat ${room.gameState.turnSeat})` });
      if (typeof callback === 'function') callback({ ok: false, error: 'Not your turn' });
      return;
    }

    const legalMoves = getLegalMoves(room.gameState, player.seat);
    const isLegal = legalMoves.some(c => c.id === payload?.cardId);
    if (!isLegal) {
      socket.emit('error', { message: `Illegal move: card ${payload?.cardId} is not allowed` });
      if (typeof callback === 'function') callback({ ok: false, error: 'Illegal move' });
      return;
    }

    try {
      clearRoomTimers(room);
      executeMove(room, player.seat, payload.cardId);
      if (typeof callback === 'function') callback({ ok: true });
    } catch (err) {
      const msg = err instanceof IllegalMoveError ? err.message : 'Error executing move';
      socket.emit('error', { message: msg });
      if (typeof callback === 'function') callback({ ok: false, error: msg });
    }
  });

  // room:rematch
  socket.on('room:rematch', (_payload: unknown, callback?: (res: any) => void) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.code);
    if (!room) return;

    const caller = room.players.find(p => p.token === meta.token);
    if (!caller || caller.seat !== room.hostSeat) {
      socket.emit('error', { message: 'Only host can trigger rematch' });
      if (typeof callback === 'function') callback({ ok: false, error: 'Only host can trigger rematch' });
      return;
    }

    if (room.status !== 'finished') {
      socket.emit('error', { message: 'Game has not finished yet' });
      if (typeof callback === 'function') callback({ ok: false, error: 'Game not finished' });
      return;
    }

    room.gameState = createGame(room.players.length, Date.now());
    room.status = 'playing';
    room.lastEvents = [];

    broadcastRoomState(room);
    triggerTurn(room);

    if (typeof callback === 'function') callback({ ok: true });
  });

  // room:leave
  socket.on('room:leave', (_payload: unknown, callback?: (res: any) => void) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.code);
    if (!room) return;

    socketToRoom.delete(socket.id);
    socket.leave(room.code);

    const playerIndex = room.players.findIndex(p => p.token === meta.token);
    if (playerIndex !== -1) {
      const player = room.players[playerIndex]!;
      if (room.status === 'waiting') {
        room.players.splice(playerIndex, 1);
        room.players.forEach((p, idx) => {
          p.seat = idx;
        });
        if (room.hostSeat === player.seat) {
          room.hostSeat = 0;
        } else if (room.hostSeat > player.seat) {
          room.hostSeat -= 1;
        }
      } else {
        player.connected = false;
        player.socketId = null;
      }
    }

    checkEmptyRoom(room);
    broadcastRoomState(room);
    if (typeof callback === 'function') callback({ ok: true });
  });

  // disconnect
  socket.on('disconnect', () => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return;

    socketToRoom.delete(socket.id);
    const room = rooms.get(meta.code);
    if (!room) return;

    const player = room.players.find(p => p.token === meta.token);
    if (!player) return;

    player.connected = false;
    player.socketId = null;

    broadcastRoomState(room);
    checkEmptyRoom(room);

    // Hold seat for 120 seconds
    player.disconnectTimeout = setTimeout(() => {
      if (room.status === 'playing') {
        // Convert to bot permanently
        player.isBot = true;
        player.name = `${player.name} (Bot)`;
        broadcastRoomState(room);
        if (room.gameState && room.gameState.turnSeat === player.seat) {
          triggerTurn(room);
        }
      } else if (room.status === 'waiting') {
        // Remove from lobby
        const idx = room.players.findIndex(p => p.token === player.token);
        if (idx !== -1) {
          room.players.splice(idx, 1);
          room.players.forEach((p, i) => {
            p.seat = i;
          });
          if (room.hostSeat >= room.players.length) {
            room.hostSeat = 0;
          }
          broadcastRoomState(room);
          checkEmptyRoom(room);
        }
      }
    }, RECONNECT_HOLD_MS);
  });
});

server.listen(PORT, () => {
  console.log(`Bhabhi game server running on port ${PORT}`);
});
