import { describe, expect, it } from 'vitest';
import {
  applyMove,
  Card,
  createDeck,
  createGame,
  deal,
  GameState,
  getLegalMoves,
  IllegalMoveError,
  mulberry32,
  PlayerState,
  Rank,
  Seat,
  Suit,
  TrickPlay,
} from '../src';

/**
 * Helper to parse shorthand card string like "S14", "H10", "D2", "C7"
 */
function parseCard(input: string | Card): Card {
  if (typeof input !== 'string') {
    return input;
  }
  const suit = input[0] as Suit;
  const rank = parseInt(input.slice(1), 10) as Rank;
  return { suit, rank, id: input };
}

interface MakeStateOptions {
  hands: (string | Card)[][];
  turnSeat?: Seat;
  trick?: {
    leaderSeat?: Seat;
    ledSuit?: Suit | null;
    plays?: { seat: Seat; card: string | Card }[];
    isFirstTrick?: boolean;
  };
  discard?: (string | Card)[];
  phase?: 'playing' | 'finished';
  bhabhiSeat?: Seat | null;
  isDraw?: boolean;
  trickNumber?: number;
  finishCounter?: number;
  outPlayers?: Seat[];
  finishPositions?: Record<Seat, number>;
}

/**
 * Helper to construct game states by hand without relying on shuffling.
 */
function makeState(opts: MakeStateOptions): GameState {
  const playerCount = opts.hands.length;
  const outSet = new Set(opts.outPlayers || []);
  const finishPositions = opts.finishPositions || {};

  const players: PlayerState[] = opts.hands.map((h, seat) => {
    const hand = h.map(parseCard);
    const isOut = outSet.has(seat) || (h.length === 0 && opts.outPlayers === undefined);
    return {
      seat,
      hand,
      out: isOut,
      finishPosition: finishPositions[seat] ?? null,
    };
  });

  const leaderSeat = opts.trick?.leaderSeat ?? 0;
  const plays: TrickPlay[] = (opts.trick?.plays || []).map(p => ({
    seat: p.seat,
    card: parseCard(p.card),
  }));

  const ledSuit = opts.trick?.ledSuit !== undefined
    ? opts.trick.ledSuit
    : (plays.length > 0 ? plays[0]!.card.suit : null);

  const trick = {
    leaderSeat,
    ledSuit,
    plays,
    isFirstTrick: opts.trick?.isFirstTrick ?? false,
  };

  return {
    players,
    turnSeat: opts.turnSeat ?? (plays.length > 0 ? (plays[plays.length - 1]!.seat + 1) % playerCount : leaderSeat),
    trick,
    discard: (opts.discard || []).map(parseCard),
    phase: opts.phase || 'playing',
    bhabhiSeat: opts.bhabhiSeat ?? null,
    isDraw: opts.isDraw ?? false,
    trickNumber: opts.trickNumber ?? 1,
    finishCounter: opts.finishCounter ?? 1,
  };
}

describe('Bhabhi Rules Spec v1 - Required Scenarios', () => {
  // Scenario 1
  it('1. Deal: 52 cards split correctly for 2..8 players, extras go to lower seats (S1, S4)', () => {
    for (let p = 2; p <= 8; p++) {
      const deck = createDeck();
      expect(deck.length).toBe(52);
      const hands = deal(deck, p);
      expect(hands.length).toBe(p);

      const base = Math.floor(52 / p);
      const remainder = 52 % p;

      let totalCards = 0;
      for (let s = 0; s < p; s++) {
        const expectedCount = s < remainder ? base + 1 : base;
        expect(hands[s]!.length).toBe(expectedCount);
        totalCards += hands[s]!.length;
      }
      expect(totalCards).toBe(52);

      // Verify all 52 cards are unique
      const allDealt = hands.flat();
      const uniqueIds = new Set(allDealt.map(c => c.id));
      expect(uniqueIds.size).toBe(52);
    }
  });

  // Scenario 2
  it('2. A♠ holder is the first leader and the only legal first move is A♠ (S6)', () => {
    for (const seed of [1, 42, 999]) {
      const state = createGame(4, seed);
      const leaderSeat = state.turnSeat;
      const leader = state.players[leaderSeat]!;
      expect(leader.hand.some(c => c.id === 'S14')).toBe(true);
      expect(state.trick.leaderSeat).toBe(leaderSeat);
      expect(state.trick.isFirstTrick).toBe(true);

      const legal = getLegalMoves(state, leaderSeat);
      expect(legal.length).toBe(1);
      expect(legal[0]!.id).toBe('S14');

      const nonASpades = leader.hand.find(c => c.id !== 'S14');
      if (nonASpades) {
        expect(() => applyMove(state, leaderSeat, nonASpades.id)).toThrow(IllegalMoveError);
      }
    }
  });

  // Scenario 3
  it('3. T3: must follow suit if able; illegal to play another suit', () => {
    const state = makeState({
      hands: [
        ['H10'],
        ['H4', 'D10', 'C8'],
        ['H7'],
      ],
      turnSeat: 1,
      trick: {
        leaderSeat: 0,
        ledSuit: 'H',
        plays: [{ seat: 0, card: 'H10' }],
      },
    });

    const legal = getLegalMoves(state, 1);
    expect(legal.map(c => c.id)).toEqual(['H4']);

    expect(() => applyMove(state, 1, 'D10')).toThrow(IllegalMoveError);
    expect(() => applyMove(state, 1, 'C8')).toThrow(IllegalMoveError);

    // Following suit is accepted
    const next = applyMove(state, 1, 'H4');
    expect(next.state.trick.plays.length).toBe(2);
  });

  // Scenario 4
  it('4. T5: first trick, player with no spade can cut only with rank <= 10', () => {
    const state = makeState({
      hands: [
        ['S14'],
        ['H14', 'D12', 'C11', 'H8', 'D4'],
        ['S5'],
      ],
      turnSeat: 1,
      trick: {
        leaderSeat: 0,
        ledSuit: 'S',
        plays: [{ seat: 0, card: 'S14' }],
        isFirstTrick: true,
      },
    });

    const legal = getLegalMoves(state, 1);
    expect(legal.map(c => c.id).sort()).toEqual(['D4', 'H8'].sort());

    // Playing Ace, Queen, Jack of other suits is illegal
    expect(() => applyMove(state, 1, 'H14')).toThrow(IllegalMoveError);
    expect(() => applyMove(state, 1, 'D12')).toThrow(IllegalMoveError);
    expect(() => applyMove(state, 1, 'C11')).toThrow(IllegalMoveError);

    // Playing rank <= 10 is legal
    expect(() => applyMove(state, 1, 'H8')).not.toThrow();
  });

  // Scenario 5
  it('5. T5 waiver: first trick, no spade and no card <= 10, any card allowed', () => {
    const state = makeState({
      hands: [
        ['S14'],
        ['H14', 'D13', 'C12', 'H11'],
        ['S5'],
      ],
      turnSeat: 1,
      trick: {
        leaderSeat: 0,
        ledSuit: 'S',
        plays: [{ seat: 0, card: 'S14' }],
        isFirstTrick: true,
      },
    });

    const legal = getLegalMoves(state, 1);
    expect(legal.length).toBe(4);
    expect(() => applyMove(state, 1, 'H14')).not.toThrow();
  });

  // Scenario 6
  it('6. T6: second trick onwards, a cut with an Ace is allowed', () => {
    const state = makeState({
      hands: [
        ['C7'],
        ['D14', 'H13', 'S2'], // holds Ace of Diamonds
        ['C9'],
      ],
      turnSeat: 1,
      trick: {
        leaderSeat: 0,
        ledSuit: 'C',
        plays: [{ seat: 0, card: 'C7' }],
        isFirstTrick: false,
      },
      trickNumber: 2,
    });

    const legal = getLegalMoves(state, 1);
    expect(legal.some(c => c.id === 'D14')).toBe(true);
    expect(() => applyMove(state, 1, 'D14')).not.toThrow();
  });

  // Scenario 7
  it('7. R1: all follow, highest wins, cards discarded, winner leads next', () => {
    const state = makeState({
      hands: [
        ['D5', 'H2'],
        ['D12', 'C2'],
        ['D8', 'S2'],
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, isFirstTrick: false },
    });

    const step1 = applyMove(state, 0, 'D5');
    const step2 = applyMove(step1.state, 1, 'D12');
    const step3 = applyMove(step2.state, 2, 'D8');

    expect(step3.state.discard.map(c => c.id).sort()).toEqual(['D12', 'D5', 'D8'].sort());
    expect(step3.state.turnSeat).toBe(1);
    expect(step3.state.trick.leaderSeat).toBe(1);
    expect(step3.events.some(e => e.type === 'TRICK_WON' && e.seat === 1)).toBe(true);
  });

  // Scenario 8
  it('8. R2: cut happens, leader (or highest so far) picks up all cards including the cut', () => {
    const state = makeState({
      hands: [
        ['S5', 'C2'],
        ['H7', 'D2'],
        ['S9'],
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, isFirstTrick: false },
    });

    const s1 = applyMove(state, 0, 'S5');
    const s2 = applyMove(s1.state, 1, 'H7'); // Seat 1 cuts with H7

    // Cut ends trick immediately; seat 2 never plays
    expect(s2.events.some(e => e.type === 'CUT')).toBe(true);
    expect(s2.events.some(e => e.type === 'PICKED_UP' && e.seat === 0)).toBe(true);

    // Leader (seat 0) picked up S5 and H7
    expect(s2.state.players[0]!.hand.map(c => c.id).sort()).toEqual(['C2', 'H7', 'S5'].sort());
    // Leader leads next
    expect(s2.state.turnSeat).toBe(0);
    expect(s2.state.trick.leaderSeat).toBe(0);
  });

  // Scenario 9
  it('9. R2 with a higher card played before the cut: that player picks up, not the leader', () => {
    const state = makeState({
      hands: [
        ['C6', 'H2'],
        ['C11', 'D2'],
        ['H3', 'S2'],
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, isFirstTrick: false },
    });

    const s1 = applyMove(state, 0, 'C6');
    const s2 = applyMove(s1.state, 1, 'C11');
    const s3 = applyMove(s2.state, 2, 'H3'); // Seat 2 cuts with H3

    expect(s3.events.some(e => e.type === 'CUT')).toBe(true);
    const pickup = s3.events.find(e => e.type === 'PICKED_UP');
    expect(pickup).toBeDefined();
    if (pickup && pickup.type === 'PICKED_UP') {
      expect(pickup.seat).toBe(1); // Seat 1 played C11 > C6
      expect(pickup.cards.map(c => c.id).sort()).toEqual(['C11', 'C6', 'H3'].sort());
    }

    expect(s3.state.players[1]!.hand.map(c => c.id).sort()).toEqual(['C11', 'C6', 'D2', 'H3'].sort());
    expect(s3.state.turnSeat).toBe(1);
    expect(s3.state.trick.leaderSeat).toBe(1);
  });

  // Scenario 10
  it('10. E2: a player with one card left follows suit with a LOWER card than the lead: trick resolves normally, they become out, the leader/winner keeps going', () => {
    const state = makeState({
      hands: [
        ['H10', 'D2'],
        ['H4'], // one card left, lower than H10
        ['H7', 'C2'],
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, isFirstTrick: false },
    });

    const s1 = applyMove(state, 0, 'H10');
    const s2 = applyMove(s1.state, 1, 'H4');
    const s3 = applyMove(s2.state, 2, 'H7');

    expect(s3.state.players[1]!.out).toBe(true);
    expect(s3.state.players[1]!.finishPosition).toBe(1);
    expect(s3.events.some(e => e.type === 'PLAYER_OUT' && e.seat === 1)).toBe(true);

    // Winner is seat 0 (H10)
    expect(s3.state.turnSeat).toBe(0);
    expect(s3.state.trick.leaderSeat).toBe(0);
    expect(s3.state.players[0]!.out).toBe(false);
  });

  // Scenario 11
  it('11. E2: one-card player follows with a HIGHER card: they win and are out, lead passes to the next active seat clockwise (E6)', () => {
    const state = makeState({
      hands: [
        ['D7', 'H2'],
        ['D12'], // one card left, higher than D7
        ['D3', 'C2'],
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, isFirstTrick: false },
    });

    const s1 = applyMove(state, 0, 'D7');
    const s2 = applyMove(s1.state, 1, 'D12');
    const s3 = applyMove(s2.state, 2, 'D3');

    // Seat 1 won and is out
    expect(s3.state.players[1]!.out).toBe(true);
    expect(s3.state.players[1]!.finishPosition).toBe(1);

    // E6: Lead passes to next active seat clockwise from seat 1 -> seat 2
    expect(s3.state.turnSeat).toBe(2);
    expect(s3.state.trick.leaderSeat).toBe(2);
  });

  // Scenario 12
  it('12. E3: one-card player cuts: they are out, the pickup player takes the cards', () => {
    const state = makeState({
      hands: [
        ['S10', 'C2'],
        ['H4'], // one card left, void in spades -> cuts
        ['S5', 'D2'],
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, isFirstTrick: false },
    });

    const s1 = applyMove(state, 0, 'S10');
    const s2 = applyMove(s1.state, 1, 'H4'); // cuts

    expect(s2.state.players[1]!.out).toBe(true);
    expect(s2.state.players[1]!.finishPosition).toBe(1);
    expect(s2.state.players[0]!.hand.map(c => c.id).sort()).toEqual(['C2', 'H4', 'S10'].sort());

    // Seat 0 picks up and leads next
    expect(s2.state.turnSeat).toBe(0);
    expect(s2.state.trick.leaderSeat).toBe(0);
  });

  // Scenario 13
  it('13. E4/E5: one-card leader, later someone cuts: leader picks up and is NOT out', () => {
    const state = makeState({
      hands: [
        ['C9'], // one-card leader
        ['D3', 'S2'],
        ['C5', 'H2'],
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, isFirstTrick: false },
    });

    const s1 = applyMove(state, 0, 'C9');
    const s2 = applyMove(s1.state, 1, 'D3'); // seat 1 cuts

    // Leader (seat 0) picked up cards, now has 2 cards and is NOT out
    expect(s2.state.players[0]!.out).toBe(false);
    expect(s2.state.players[0]!.hand.length).toBe(2);
    expect(s2.state.turnSeat).toBe(0);
  });

  // Scenario 14
  it('14. E5: one-card player plays highest, then a later player cuts: that player picks up and is NOT out', () => {
    const state = makeState({
      hands: [
        ['D4', 'H2'],
        ['D13'], // one card left, plays highest diamond so far
        ['S2', 'C2'],
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, isFirstTrick: false },
    });

    const s1 = applyMove(state, 0, 'D4');
    const s2 = applyMove(s1.state, 1, 'D13');
    const s3 = applyMove(s2.state, 2, 'S2'); // seat 2 cuts

    // Seat 1 was highest diamond before cut -> picks up and is NOT out
    expect(s3.state.players[1]!.out).toBe(false);
    expect(s3.state.players[1]!.hand.length).toBe(3);
    expect(s3.state.turnSeat).toBe(1);
  });

  // Scenario 15
  it('15. E6: winner is out, lead goes to the next active seat', () => {
    const state = makeState({
      hands: [
        ['H14'], // winner (seat 0) has 1 card
        [], // seat 1 is already out
        ['H5', 'C2'],
        ['H8', 'D2'],
      ],
      turnSeat: 0,
      outPlayers: [1],
      trick: { leaderSeat: 0, isFirstTrick: false },
    });

    const s1 = applyMove(state, 0, 'H14');
    // Seat 1 is skipped because they are out
    expect(s1.state.turnSeat).toBe(2);
    const s2 = applyMove(s1.state, 2, 'H5');
    const s3 = applyMove(s2.state, 3, 'H8');

    // Seat 0 won and is out
    expect(s3.state.players[0]!.out).toBe(true);
    // Clockwise from seat 0: seat 1 is out, so next active seat is 2
    expect(s3.state.turnSeat).toBe(2);
    expect(s3.state.trick.leaderSeat).toBe(2);
  });

  // Scenario 16
  it('16. G2: end game with exactly one player left holding cards means that player is Bhabhi', () => {
    const state = makeState({
      hands: [
        ['H5'],
        ['H8'],
        ['H2', 'C3'],
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, isFirstTrick: false },
    });

    const s1 = applyMove(state, 0, 'H5');
    const s2 = applyMove(s1.state, 1, 'H8');
    const s3 = applyMove(s2.state, 2, 'H2');

    expect(s3.state.players[0]!.out).toBe(true);
    expect(s3.state.players[1]!.out).toBe(true);
    expect(s3.state.players[2]!.out).toBe(false);

    expect(s3.state.phase).toBe('finished');
    expect(s3.state.bhabhiSeat).toBe(2);
    expect(s3.state.isDraw).toBe(false);
  });

  // Scenario 17
  it('17. G3: final two players both play their last card (both follow suit): draw, bhabhiSeat null, isDraw true', () => {
    const state = makeState({
      hands: [
        ['S8'],
        ['S10'],
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, isFirstTrick: false },
    });

    const s1 = applyMove(state, 0, 'S8');
    const s2 = applyMove(s1.state, 1, 'S10');

    expect(s2.state.phase).toBe('finished');
    expect(s2.state.isDraw).toBe(true);
    expect(s2.state.bhabhiSeat).toBeNull();
  });

  // Scenario 18
  it('18. G4: two players eliminated in the same trick share the same finishPosition', () => {
    const state = makeState({
      hands: [
        ['D5'],
        ['D7'],
        ['D2', 'C4'],
        ['D9', 'S3'],
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, isFirstTrick: false },
      finishCounter: 1,
    });

    const s1 = applyMove(state, 0, 'D5');
    const s2 = applyMove(s1.state, 1, 'D7');
    const s3 = applyMove(s2.state, 2, 'D2');
    const s4 = applyMove(s3.state, 3, 'D9');

    expect(s4.state.players[0]!.out).toBe(true);
    expect(s4.state.players[1]!.out).toBe(true);
    expect(s4.state.players[0]!.finishPosition).toBe(1);
    expect(s4.state.players[1]!.finishPosition).toBe(1);
  });

  // Scenario 19
  it('19. Illegal moves throw: wrong turn, card not owned, not following suit, playing after game over', () => {
    const state = makeState({
      hands: [
        ['H10', 'D2'],
        ['H4', 'C5'],
      ],
      turnSeat: 0,
      trick: { leaderSeat: 0, isFirstTrick: false },
    });

    // 1. Wrong turn
    expect(() => applyMove(state, 1, 'H4')).toThrow(IllegalMoveError);

    // 2. Card not owned
    expect(() => applyMove(state, 0, 'S14')).toThrow(IllegalMoveError);

    const s1 = applyMove(state, 0, 'H10');

    // 3. Not following suit
    expect(() => applyMove(s1.state, 1, 'C5')).toThrow(IllegalMoveError);

    // 4. Playing after game over
    const finishedState = makeState({
      hands: [['H2'], ['H3']],
      phase: 'finished',
    });
    expect(() => applyMove(finishedState, 0, 'H2')).toThrow(IllegalMoveError);
  });

  // Scenario 20
  it('20. Full simulated games: 500 random games always terminate, never throw, conserve 52 cards', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const playerCount = 2 + ((seed - 1) % 7); // 2..8
      let state = createGame(playerCount, seed);
      const rng = mulberry32(seed * 7919);

      let steps = 0;
      const MAX_STEPS = 20000;

      while (state.phase !== 'finished' && steps < MAX_STEPS) {
        steps++;
        const turn = state.turnSeat;
        const legal = getLegalMoves(state, turn);

        expect(legal.length).toBeGreaterThan(0);
        const chosenCard = legal[Math.floor(rng() * legal.length)]!;

        const result = applyMove(state, turn, chosenCard.id);
        state = result.state;

        // Card invariant: hands + discard + current trick plays = 52
        const handsTotal = state.players.reduce((sum, p) => sum + p.hand.length, 0);
        const totalCards = handsTotal + state.discard.length + state.trick.plays.length;
        expect(totalCards).toBe(52);
      }

      expect(steps).toBeLessThan(MAX_STEPS);
      expect(state.phase).toBe('finished');
      if (state.isDraw) {
        expect(state.bhabhiSeat).toBeNull();
      } else {
        expect(state.bhabhiSeat).not.toBeNull();
        expect(state.players[state.bhabhiSeat!]!.hand.length).toBeGreaterThan(0);
      }
    }
  }, 60000); // 60s timeout for 500 games
});
