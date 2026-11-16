import { describe, expect, it } from 'vitest';
import {
  createDeck,
  deal,
  mulberry32,
  shuffle,
  createGame,
  applyMove,
  getLegalMoves,
  getPublicView,
  IllegalMoveError,
  GameState,
  Card,
} from '../src';

describe('Deck & Deal', () => {
  it('creates standard 52-card deck (S1, S2)', () => {
    const deck = createDeck();
    expect(deck.length).toBe(52);
    const aSpades = deck.find(c => c.id === 'S14');
    expect(aSpades).toBeDefined();
    expect(aSpades?.rank).toBe(14);
  });

  it('deals 52 cards clockwise with lower seats getting extras (S4)', () => {
    const deck = createDeck();
    const hands3 = deal(deck, 3);
    // 52 / 3 = 17 remainder 1 -> seat 0 gets 18, seats 1 and 2 get 17
    expect(hands3[0].length).toBe(18);
    expect(hands3[1].length).toBe(17);
    expect(hands3[2].length).toBe(17);

    const hands5 = deal(deck, 5);
    // 52 / 5 = 10 remainder 2 -> seats 0,1 get 11, seats 2,3,4 get 10
    expect(hands5[0].length).toBe(11);
    expect(hands5[1].length).toBe(11);
    expect(hands5[2].length).toBe(10);
    expect(hands5[3].length).toBe(10);
    expect(hands5[4].length).toBe(10);
  });
});

describe('Game Setup & Initial Turn (S6, T1)', () => {
  it('sets turnSeat to A♠ holder who can only lead A♠ (S6)', () => {
    const game = createGame(4, 42);
    const leader = game.players[game.turnSeat];
    expect(leader.hand.some(c => c.id === 'S14')).toBe(true);

    const legal = getLegalMoves(game, game.turnSeat);
    expect(legal.length).toBe(1);
    expect(legal[0].id).toBe('S14');

    // Trying to play any other card throws IllegalMoveError
    const nonASpades = leader.hand.find(c => c.id !== 'S14')!;
    expect(() => applyMove(game, game.turnSeat, nonASpades.id)).toThrow(IllegalMoveError);
  });
});

describe('Follow & Cut Rules (T1 - T6)', () => {
  function makeMockState(overrides: Partial<GameState>): GameState {
    const defaultState: GameState = {
      players: [
        { seat: 0, hand: [], out: false, finishPosition: null },
        { seat: 1, hand: [], out: false, finishPosition: null },
        { seat: 2, hand: [], out: false, finishPosition: null },
      ],
      turnSeat: 0,
      trick: {
        leaderSeat: 0,
        ledSuit: null,
        plays: [],
        isFirstTrick: false,
      },
      discard: [],
      phase: 'playing',
      bhabhiSeat: null,
      isDraw: false,
      trickNumber: 1,
      finishCounter: 1,
    };
    return { ...defaultState, ...overrides };
  }

  it('must follow suit if holding led suit (T3)', () => {
    const state = makeMockState({
      turnSeat: 1,
      trick: {
        leaderSeat: 0,
        ledSuit: 'H',
        plays: [{ seat: 0, card: { suit: 'H', rank: 5, id: 'H5' } }],
        isFirstTrick: false,
      },
      players: [
        { seat: 0, hand: [], out: false, finishPosition: null },
        {
          seat: 1,
          hand: [
            { suit: 'H', rank: 2, id: 'H2' },
            { suit: 'D', rank: 14, id: 'D14' },
          ],
          out: false,
          finishPosition: null,
        },
        { seat: 2, hand: [], out: false, finishPosition: null },
      ],
    });

    const legal = getLegalMoves(state, 1);
    expect(legal.length).toBe(1);
    expect(legal[0].id).toBe('H2');
  });

  it('first trick cut restriction enforces <= 10 (T5)', () => {
    const state = makeMockState({
      turnSeat: 1,
      trick: {
        leaderSeat: 0,
        ledSuit: 'S',
        plays: [{ seat: 0, card: { suit: 'S', rank: 14, id: 'S14' } }],
        isFirstTrick: true,
      },
      players: [
        { seat: 0, hand: [], out: false, finishPosition: null },
        {
          seat: 1,
          hand: [
            { suit: 'H', rank: 12, id: 'H12' }, // Q
            { suit: 'D', rank: 7, id: 'D7' },   // 7
            { suit: 'C', rank: 14, id: 'C14' }, // A
          ],
          out: false,
          finishPosition: null,
        },
        { seat: 2, hand: [], out: false, finishPosition: null },
      ],
    });

    const legal = getLegalMoves(state, 1);
    expect(legal.map(c => c.id)).toEqual(['D7']);
  });

  it('first trick cut restriction waived when holding only > 10 (T5)', () => {
    const state = makeMockState({
      turnSeat: 1,
      trick: {
        leaderSeat: 0,
        ledSuit: 'S',
        plays: [{ seat: 0, card: { suit: 'S', rank: 14, id: 'S14' } }],
        isFirstTrick: true,
      },
      players: [
        { seat: 0, hand: [], out: false, finishPosition: null },
        {
          seat: 1,
          hand: [
            { suit: 'H', rank: 11, id: 'H11' }, // J
            { suit: 'D', rank: 12, id: 'D12' }, // Q
            { suit: 'C', rank: 13, id: 'C13' }, // K
          ],
          out: false,
          finishPosition: null,
        },
        { seat: 2, hand: [], out: false, finishPosition: null },
      ],
    });

    const legal = getLegalMoves(state, 1);
    expect(legal.length).toBe(3);
  });
});

describe('Trick Resolution & Edge Cases (R1-R3, E1-E7, G1-G4)', () => {
  it('resolves NO CUT by discarding and highest card winner leads next (R1)', () => {
    const state: GameState = {
      players: [
        { seat: 0, hand: [{ suit: 'H', rank: 5, id: 'H5' }], out: false, finishPosition: null },
        { seat: 1, hand: [{ suit: 'H', rank: 10, id: 'H10' }], out: false, finishPosition: null },
        { seat: 2, hand: [{ suit: 'H', rank: 8, id: 'H8' }], out: false, finishPosition: null },
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, ledSuit: null, plays: [], isFirstTrick: false },
      discard: [],
      phase: 'playing',
      bhabhiSeat: null,
      isDraw: false,
      trickNumber: 2,
      finishCounter: 1,
    };

    const res1 = applyMove(state, 0, 'H5');
    const res2 = applyMove(res1.state, 1, 'H10');
    const res3 = applyMove(res2.state, 2, 'H8');

    expect(res3.state.discard.length).toBe(3);
    const winEvent = res3.events.find(e => e.type === 'TRICK_WON');
    expect(winEvent).toBeDefined();
    if (winEvent && winEvent.type === 'TRICK_WON') {
      expect(winEvent.seat).toBe(1); // seat 1 played H10 (highest)
    }
  });

  it('resolves CUT by having highest led suit player pick up all cards (R2, R3)', () => {
    const state: GameState = {
      players: [
        { seat: 0, hand: [{ suit: 'C', rank: 8, id: 'C8' }], out: false, finishPosition: null },
        { seat: 1, hand: [{ suit: 'C', rank: 13, id: 'C13' }], out: false, finishPosition: null },
        { seat: 2, hand: [{ suit: 'H', rank: 2, id: 'H2' }], out: false, finishPosition: null },
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, ledSuit: null, plays: [], isFirstTrick: false },
      discard: [],
      phase: 'playing',
      bhabhiSeat: null,
      isDraw: false,
      trickNumber: 2,
      finishCounter: 1,
    };

    const res1 = applyMove(state, 0, 'C8');
    const res2 = applyMove(res1.state, 1, 'C13');
    // Seat 2 cuts with H2
    const res3 = applyMove(res2.state, 2, 'H2');

    expect(res3.events.some(e => e.type === 'CUT')).toBe(true);
    const pickupEvent = res3.events.find(e => e.type === 'PICKED_UP');
    expect(pickupEvent).toBeDefined();
    if (pickupEvent && pickupEvent.type === 'PICKED_UP') {
      expect(pickupEvent.seat).toBe(1); // Seat 1 had highest Club (C13)
      expect(pickupEvent.cards.length).toBe(3);
    }
    // Seat 1 picks up all 3 cards: C8, C13, H2
    expect(res3.state.players[1].hand.length).toBe(3);
    // Next leader is pickup player (seat 1)
    expect(res3.state.turnSeat).toBe(1);
    expect(res3.state.trick.leaderSeat).toBe(1);
  });

  it('handles simultaneous eliminations as DRAW if 0 players remain (G3, G4)', () => {
    const state: GameState = {
      players: [
        { seat: 0, hand: [{ suit: 'S', rank: 5, id: 'S5' }], out: false, finishPosition: null },
        { seat: 1, hand: [{ suit: 'S', rank: 9, id: 'S9' }], out: false, finishPosition: null },
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, ledSuit: null, plays: [], isFirstTrick: false },
      discard: [],
      phase: 'playing',
      bhabhiSeat: null,
      isDraw: false,
      trickNumber: 5,
      finishCounter: 1,
    };

    const r1 = applyMove(state, 0, 'S5');
    const r2 = applyMove(r1.state, 1, 'S9');

    expect(r2.state.phase).toBe('finished');
    expect(r2.state.isDraw).toBe(true);
    expect(r2.state.bhabhiSeat).toBeNull();
    expect(r2.events.some(e => e.type === 'GAME_OVER')).toBe(true);
  });

  it('correctly identifies BHABHI when 1 player remains (G1, G2)', () => {
    const state: GameState = {
      players: [
        { seat: 0, hand: [{ suit: 'D', rank: 5, id: 'D5' }], out: false, finishPosition: null },
        { seat: 1, hand: [{ suit: 'D', rank: 7, id: 'D7' }], out: false, finishPosition: null },
        { seat: 2, hand: [{ suit: 'D', rank: 2, id: 'D2' }, { suit: 'C', rank: 3, id: 'C3' }], out: false, finishPosition: null },
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, ledSuit: null, plays: [], isFirstTrick: false },
      discard: [],
      phase: 'playing',
      bhabhiSeat: null,
      isDraw: false,
      trickNumber: 4,
      finishCounter: 1,
    };

    const r1 = applyMove(state, 0, 'D5');
    const r2 = applyMove(r1.state, 1, 'D7');
    const r3 = applyMove(r2.state, 2, 'D2');

    // Seat 0 and Seat 1 have now emptied their hands and are safe
    expect(r3.state.players[0].out).toBe(true);
    expect(r3.state.players[1].out).toBe(true);
    expect(r3.state.players[2].out).toBe(false);

    // Only seat 2 remains -> Seat 2 is BHABHI
    expect(r3.state.phase).toBe('finished');
    expect(r3.state.bhabhiSeat).toBe(2);
    expect(r3.state.isDraw).toBe(false);
  });

  it('masks other players hands in getPublicView', () => {
    const game = createGame(3, 100);
    const pub = getPublicView(game, 0);

    expect(pub.players[0].hand).toBeDefined();
    expect(pub.players[0].handSize).toBe(pub.players[0].hand!.length);
    expect(pub.players[1].hand).toBeUndefined();
    expect(pub.players[1].handSize).toBeGreaterThan(0);
    expect(pub.players[2].hand).toBeUndefined();
    expect(pub.players[2].handSize).toBeGreaterThan(0);
  });
});
