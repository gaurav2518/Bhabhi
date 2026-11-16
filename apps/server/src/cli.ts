import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  applyMove,
  Card,
  createGame,
  GameEvent,
  GameState,
  getLegalMoves,
  IllegalMoveError,
  Seat,
  Suit,
} from '@bhabhi/engine';

const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

const RANK_NAMES: Record<number, string> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

function formatCard(c: Card): string {
  const rankStr = RANK_NAMES[c.rank] ?? String(c.rank);
  const symbol = SUIT_SYMBOLS[c.suit];
  return `${c.id} (${rankStr}${symbol})`;
}

const SUIT_ORDER: Record<Suit, number> = {
  S: 0,
  H: 1,
  D: 2,
  C: 3,
};

function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return a.rank - b.rank;
  });
}

function printEvents(events: GameEvent[]): void {
  for (const e of events) {
    switch (e.type) {
      case 'CARD_PLAYED':
        console.log(`  -> Seat ${e.seat} played ${formatCard(e.card)}`);
        break;
      case 'CUT':
        console.log(`  💥 CUT! Seat ${e.seat} cut with ${formatCard(e.card)}!`);
        break;
      case 'PICKED_UP':
        console.log(`  📥 Seat ${e.seat} picked up ${e.cards.length} card(s)!`);
        break;
      case 'TRICK_WON':
        console.log(`  🏆 Seat ${e.seat} won the trick! (${e.cards.length} cards discarded)`);
        break;
      case 'PLAYER_OUT':
        console.log(`  🎉 Seat ${e.seat} is SAFE and OUT! (Finish position: #${e.finishPosition})`);
        break;
      case 'GAME_OVER':
        if (e.isDraw) {
          console.log('\n====================================');
          console.log('🤝 GAME OVER: DRAW! Everyone is a winner!');
          console.log('====================================\n');
        } else {
          console.log('\n====================================');
          console.log(`🚨 GAME OVER! Seat ${e.bhabhiSeat} is the BHABHI (Loser)!`);
          console.log('====================================\n');
        }
        break;
    }
  }
}

function printGameState(state: GameState): void {
  console.log('\n------------------------------------------------------------');
  console.log(`Trick #${state.trickNumber} | Led Suit: ${state.trick.ledSuit ? `${state.trick.ledSuit} (${SUIT_SYMBOLS[state.trick.ledSuit]})` : 'None (Leading)'} | Discard Pile: ${state.discard.length} cards`);

  // Active players
  const playerStatuses = state.players.map(p => {
    if (p.out) {
      return `Seat ${p.seat}: OUT (#${p.finishPosition})`;
    }
    const isCurrent = p.seat === state.turnSeat ? '*' : '';
    return `Seat ${p.seat}${isCurrent}: ${p.hand.length} card(s)`;
  });
  console.log(`Players: ${playerStatuses.join(' | ')}`);

  // Current trick plays
  if (state.trick.plays.length > 0) {
    console.log('Current Trick Plays:');
    for (const play of state.trick.plays) {
      console.log(`  Seat ${play.seat}: ${formatCard(play.card)}`);
    }
  } else {
    console.log('Current Trick: [Empty]');
  }

  // Seat 0 (human) hand
  const human = state.players[0]!;
  if (!human.out) {
    const sortedHand = sortCards(human.hand);
    const legalMoves = state.turnSeat === 0 ? getLegalMoves(state, 0) : [];
    const legalIds = new Set(legalMoves.map(c => c.id));

    console.log('\nYour Hand (Seat 0):');
    const handStr = sortedHand
      .map((c, i) => {
        const isLegal = legalIds.has(c.id);
        const tag = isLegal ? '✓' : ' ';
        return `[${i + 1}] ${formatCard(c)}${tag}`;
      })
      .join('  ');
    console.log(handStr);

    if (state.turnSeat === 0) {
      const legalDisplay = legalMoves.map(c => formatCard(c)).join(', ');
      console.log(`\n👉 YOUR TURN! Legal card(s) (marked with ✓): ${legalDisplay}`);
    } else {
      console.log(`\nWaiting for Seat ${state.turnSeat} to play...`);
    }
  } else {
    console.log('\nYou are OUT (safe)! Watching remaining players...');
    console.log(`Next to play: Seat ${state.turnSeat}`);
  }
  console.log('------------------------------------------------------------\n');
}

async function main(): Promise<void> {
  const rl = readline.createInterface({ input, output });

  try {
    console.log('====================================================');
    console.log('         WELCOME TO TERMINAL BHABHI GAME           ');
    console.log('====================================================\n');

    let playerCount = 4;
    while (true) {
      const answer = await rl.question('Enter number of players (2 to 8) [default 4]: ');
      const trimmed = answer.trim();
      if (!trimmed) {
        playerCount = 4;
        break;
      }
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 2 && num <= 8) {
        playerCount = num;
        break;
      }
      console.log('Invalid input. Please enter a number between 2 and 8.');
    }

    console.log(`\nStarting a ${playerCount}-player game. You are Seat 0.`);
    let state = createGame(playerCount, Date.now());

    // Print initial state
    printGameState(state);

    while (state.phase !== 'finished') {
      const currentSeat = state.turnSeat;

      if (currentSeat === 0 && !state.players[0]!.out) {
        // Human player's turn
        const legalMoves = getLegalMoves(state, 0);
        const sortedHand = sortCards(state.players[0]!.hand);

        let chosenCard: Card | null = null;
        while (!chosenCard) {
          const rawInput = await rl.question('Enter card ID (e.g. S14) or index number: ');
          const inputStr = rawInput.trim().toUpperCase();

          // Check if index number
          const indexNum = parseInt(inputStr, 10);
          if (!isNaN(indexNum) && indexNum >= 1 && indexNum <= sortedHand.length) {
            const cardAtIndex = sortedHand[indexNum - 1]!;
            if (legalMoves.some(c => c.id === cardAtIndex.id)) {
              chosenCard = cardAtIndex;
              break;
            } else {
              console.log(`Card ${formatCard(cardAtIndex)} is not a legal move! Legal moves: ${legalMoves.map(c => c.id).join(', ')}`);
              continue;
            }
          }

          // Check if card ID
          const matchingLegal = legalMoves.find(c => c.id.toUpperCase() === inputStr);
          if (matchingLegal) {
            chosenCard = matchingLegal;
            break;
          }

          // Check if in hand but not legal
          const inHand = sortedHand.find(c => c.id.toUpperCase() === inputStr);
          if (inHand) {
            console.log(`Card ${formatCard(inHand)} is in your hand but illegal to play right now. Legal moves: ${legalMoves.map(c => c.id).join(', ')}`);
          } else {
            console.log(`Invalid card. Please enter a valid card ID (e.g. S14) or [1-${sortedHand.length}].`);
          }
        }

        try {
          const result = applyMove(state, 0, chosenCard.id);
          state = result.state;
          console.log(`\nYou played ${formatCard(chosenCard)}:`);
          printEvents(result.events);
          if (state.phase !== 'finished') {
            printGameState(state);
          }
        } catch (err) {
          if (err instanceof IllegalMoveError) {
            console.log(`Error: ${err.message}`);
          } else {
            throw err;
          }
        }
      } else {
        // Bot's turn
        const botSeat = currentSeat as Seat;
        const legalMoves = getLegalMoves(state, botSeat);
        if (legalMoves.length === 0) {
          throw new Error(`Bot at seat ${botSeat} has no legal moves.`);
        }

        // Bot selects random legal move
        const chosen = legalMoves[Math.floor(Math.random() * legalMoves.length)]!;
        const result = applyMove(state, botSeat, chosen.id);
        state = result.state;

        console.log(`Seat ${botSeat} played ${formatCard(chosen)}:`);
        printEvents(result.events);

        if (state.phase !== 'finished') {
          printGameState(state);
        }
      }
    }

    console.log('Game finished. Thank you for playing!');
  } finally {
    rl.close();
  }
}

main().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
