import { createDeck, deal, mulberry32, shuffle } from './deck';
import { getLegalMoves } from './rules';
import { IllegalMoveError } from './types';
import type {
  Card,
  GameEvent,
  GameState,
  PlayerState,
  PublicGameState,
  PublicPlayerState,
  Seat,
  Suit,
  TrickPlay,
} from './types';

/**
 * Finds the next active (not out) seat clockwise starting from `fromSeat`.
 * S5. Turn order is increasing seat index, wrapping around.
 * E7. Eliminated players take no further turns and are skipped.
 */
export function getNextActiveSeat(players: readonly PlayerState[], fromSeat: Seat): Seat {
  const n = players.length;
  for (let offset = 1; offset <= n; offset++) {
    const seat = (fromSeat + offset) % n;
    if (!players[seat]!.out) {
      return seat;
    }
  }
  return fromSeat;
}

/**
 * Creates and initializes a new game of Bhabhi.
 * S1. Players: 2 to 8. One standard 52-card deck, no jokers.
 * S4. Shuffle, then deal all 52 cards one at a time clockwise starting from seat 0.
 * S6. The player holding the Ace of Spades (A♠) leads the first trick and must lead exactly the A♠.
 */
export function createGame(playerCount: number, seed: number = Date.now()): GameState {
  if (playerCount < 2 || playerCount > 8) {
    throw new Error('S1. Players count must be between 2 and 8.');
  }

  const rng = mulberry32(seed);
  const deck = shuffle(createDeck(), rng);
  const hands = deal(deck, playerCount);

  // S6. Find who holds A♠ (suit 'S', rank 14)
  let aSpadesSeat: Seat = -1;
  for (let s = 0; s < playerCount; s++) {
    if (hands[s]!.some(c => c.suit === 'S' && c.rank === 14)) {
      aSpadesSeat = s;
      break;
    }
  }

  if (aSpadesSeat === -1) {
    throw new Error('Corrupt deck: Ace of Spades not found.');
  }

  const players: PlayerState[] = hands.map((hand, seat) => ({
    seat,
    hand,
    out: false,
    finishPosition: null,
  }));

  return {
    players,
    turnSeat: aSpadesSeat,
    trick: {
      leaderSeat: aSpadesSeat,
      ledSuit: null,
      plays: [],
      isFirstTrick: true,
    },
    discard: [],
    phase: 'playing',
    bhabhiSeat: null,
    isDraw: false,
    trickNumber: 1,
    finishCounter: 1,
  };
}

/**
 * Applies a move immutably, returning a new GameState and emitted events.
 * Encodes R1, R2, R3, E1..E7, and G1..G4.
 */
export function applyMove(
  state: GameState,
  seat: Seat,
  cardId: string
): { state: GameState; events: GameEvent[] } {
  if (state.phase === 'finished') {
    throw new IllegalMoveError('Game is already finished.');
  }

  // S5. Turn order verification
  if (state.turnSeat !== seat) {
    throw new IllegalMoveError(`Not seat ${seat}'s turn. Current turn is seat ${state.turnSeat}.`);
  }

  const player = state.players[seat];
  if (!player || player.out) {
    throw new IllegalMoveError(`Seat ${seat} is invalid or already eliminated.`);
  }

  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) {
    throw new IllegalMoveError(`Card ${cardId} is not in seat ${seat}'s hand.`);
  }

  const legalMoves = getLegalMoves(state, seat);
  if (!legalMoves.some(c => c.id === cardId)) {
    throw new IllegalMoveError(`Card ${cardId} is not a legal move for seat ${seat}.`);
  }

  const card = player.hand[cardIndex]!;

  // Deep clone player states for immutability
  const nextPlayers: PlayerState[] = state.players.map(p => ({
    ...p,
    hand: [...p.hand],
  }));

  // Remove played card from active player's hand
  nextPlayers[seat]!.hand.splice(cardIndex, 1);

  const events: GameEvent[] = [{ type: 'CARD_PLAYED', seat, card }];

  const isLeader = state.trick.plays.length === 0;
  // T1. The leader plays one card. Its suit becomes the LED SUIT.
  const ledSuit: Suit = isLeader ? card.suit : state.trick.ledSuit!;
  const nextPlays: TrickPlay[] = [...state.trick.plays, { seat, card }];

  // T4. If a player holds NO card of the led suit, they MUST play a card of another suit. This is a CUT.
  const isCut = !isLeader && card.suit !== ledSuit;
  if (isCut) {
    events.push({ type: 'CUT', seat, card });
  }

  // Active players count at the start of this trick
  const activePlayersCount = state.players.filter(p => !p.out).length;

  // T4. A cut ends the trick immediately.
  // T2. Otherwise, going clockwise, each active player plays exactly one card.
  const trickComplete = isCut || nextPlays.length === activePlayersCount;

  if (!trickComplete) {
    // S5, E7. Advance to the next active player clockwise
    const nextTurnSeat = getNextActiveSeat(nextPlayers, seat);
    return {
      state: {
        ...state,
        players: nextPlayers,
        turnSeat: nextTurnSeat,
        trick: {
          ...state.trick,
          ledSuit,
          plays: nextPlays,
        },
      },
      events,
    };
  }

  // --- TRICK RESOLUTION (R1, R2, R3) ---
  const allTrickCards = nextPlays.map(p => p.card);
  let nextLeaderCandidate: Seat;
  const nextDiscard: Card[] = [...state.discard];

  if (isCut) {
    // R2. CUT happened: the player who has played the highest card of the led suit so far
    // in this trick (the leader counts) PICKS UP all cards played in this trick,
    // including the cutting card, and adds them to their hand. That player leads the next trick.
    // R3. A cut card is never considered when finding the highest card; only cards of the led suit count.
    const ledPlays = nextPlays.filter(p => p.card.suit === ledSuit);
    let highestLedPlay = ledPlays[0]!;
    for (let i = 1; i < ledPlays.length; i++) {
      if (ledPlays[i]!.card.rank > highestLedPlay.card.rank) {
        highestLedPlay = ledPlays[i]!;
      }
    }

    const pickupSeat = highestLedPlay.seat;
    nextPlayers[pickupSeat]!.hand.push(...allTrickCards);
    events.push({ type: 'PICKED_UP', seat: pickupSeat, cards: allTrickCards });
    nextLeaderCandidate = pickupSeat;
  } else {
    // R1. NO CUT (everyone active followed suit): the player who played the highest card
    // of the led suit WINS. All cards of the trick go to the discard pile permanently (out of play).
    // The winner leads the next trick.
    let highestPlay = nextPlays[0]!;
    for (let i = 1; i < nextPlays.length; i++) {
      if (nextPlays[i]!.card.rank > highestPlay.card.rank) {
        highestPlay = nextPlays[i]!;
      }
    }

    const winnerSeat = highestPlay.seat;
    nextDiscard.push(...allTrickCards);
    events.push({ type: 'TRICK_WON', seat: winnerSeat, cards: allTrickCards });
    nextLeaderCandidate = winnerSeat;
  }

  // --- ELIMINATIONS (E1..E7, G4) ---
  // E1. A player is eliminated ONLY after a trick fully resolves, and only if their hand is empty at that moment.
  // E2. Last card, followed suit, no cut -> eliminated (safe).
  // E3. Last card used as cut -> eliminated (safe) if not pickup player.
  // E4. Last card played as leader -> eliminated if won or not pickup.
  // E5. Hand picked up cards -> not eliminated.
  const newlyEliminated: Seat[] = [];
  for (const p of nextPlayers) {
    if (!p.out && p.hand.length === 0) {
      newlyEliminated.push(p.seat);
    }
  }

  let finishCounter = state.finishCounter;
  if (newlyEliminated.length > 0) {
    // G4. Players eliminated in the same trick share the same finish position.
    for (const s of newlyEliminated) {
      nextPlayers[s]!.out = true;
      nextPlayers[s]!.finishPosition = finishCounter;
      events.push({ type: 'PLAYER_OUT', seat: s, finishPosition: finishCounter });
    }
    finishCounter += 1;
  }

  // --- END OF GAME (G1..G4) ---
  // G1. The game ends as soon as at most one player still has cards after a trick resolves and eliminations are applied.
  const remainingActive = nextPlayers.filter(p => !p.out);

  if (remainingActive.length === 0) {
    // G3. If zero players have cards (the last two or more players empty their hands in the same trick),
    // there is no Bhabhi. Result: DRAW, everyone is a winner.
    events.push({ type: 'GAME_OVER', bhabhiSeat: null, isDraw: true });
    return {
      state: {
        ...state,
        players: nextPlayers,
        turnSeat: state.turnSeat,
        trick: {
          leaderSeat: nextLeaderCandidate,
          ledSuit: null,
          plays: [],
          isFirstTrick: false,
        },
        discard: nextDiscard,
        phase: 'finished',
        bhabhiSeat: null,
        isDraw: true,
        finishCounter,
      },
      events,
    };
  }

  if (remainingActive.length === 1) {
    // G2. If exactly one player still has cards, that player is the BHABHI (loser).
    // Record finish order for the others in the order they were eliminated.
    const bhabhiSeat = remainingActive[0]!.seat;
    events.push({ type: 'GAME_OVER', bhabhiSeat, isDraw: false });
    return {
      state: {
        ...state,
        players: nextPlayers,
        turnSeat: bhabhiSeat,
        trick: {
          leaderSeat: bhabhiSeat,
          ledSuit: null,
          plays: [],
          isFirstTrick: false,
        },
        discard: nextDiscard,
        phase: 'finished',
        bhabhiSeat,
        isDraw: false,
        finishCounter,
      },
      events,
    };
  }

  // E6. If the next leader (trick winner or pickup player) is eliminated,
  // the lead passes to the next active player clockwise from that seat.
  // The pickup player always has cards, so this only happens after R1.
  let nextLeader = nextLeaderCandidate;
  if (nextPlayers[nextLeader]!.out) {
    nextLeader = getNextActiveSeat(nextPlayers, nextLeaderCandidate);
  }

  return {
    state: {
      ...state,
      players: nextPlayers,
      turnSeat: nextLeader,
      trick: {
        leaderSeat: nextLeader,
        ledSuit: null,
        plays: [],
        isFirstTrick: false,
      },
      discard: nextDiscard,
      phase: 'playing',
      trickNumber: state.trickNumber + 1,
      finishCounter,
    },
    events,
  };
}

/**
 * Returns a public view of the GameState for a specific seat or spectator (null).
 * Hides other players' hands (replaces with handSize only).
 */
export function getPublicView(state: GameState, forSeat: Seat | null): PublicGameState {
  return {
    players: state.players.map(p => {
      const isTarget = forSeat !== null && p.seat === forSeat;
      const pub: PublicPlayerState = {
        seat: p.seat,
        handSize: p.hand.length,
        out: p.out,
        finishPosition: p.finishPosition,
      };
      if (isTarget) {
        pub.hand = [...p.hand];
      }
      return pub;
    }),
    turnSeat: state.turnSeat,
    trick: {
      leaderSeat: state.trick.leaderSeat,
      ledSuit: state.trick.ledSuit,
      plays: [...state.trick.plays],
      isFirstTrick: state.trick.isFirstTrick,
    },
    discard: [...state.discard],
    discardCount: state.discard.length,
    phase: state.phase,
    bhabhiSeat: state.bhabhiSeat,
    isDraw: state.isDraw,
    trickNumber: state.trickNumber,
    finishCounter: state.finishCounter,
  };
}
