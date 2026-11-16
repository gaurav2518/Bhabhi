import type { Room } from './index';

const SUIT_NAMES: Record<string, string> = {
  S: 'Spades (Hukum ♠)',
  H: 'Hearts (Paan ♥)',
  D: 'Diamonds (Eent ♦)',
  C: 'Clubs (Chidiya ♣)',
};

/**
 * Intelligent Bhabhi Dealer Chatbot ("Pandit Ji / Bhabhi Dealer")
 * Answers rules, gives gameplay hints, reports card counts, and provides lively commentary.
 */
export function getDealerChatbotReply(
  userText: string,
  room: Room,
  senderName: string
): string | null {
  const q = userText.trim().toLowerCase();

  // 1. Rules Queries
  if (
    q.includes('rule') ||
    q.includes('how to play') ||
    q.includes('khelte kaise') ||
    q === '/rules' ||
    q.includes('spec')
  ) {
    return (
      `📜 **Bhabhi Rules Quick Guide**:\n` +
      `1. **Opening**: Seat holding Ace of Spades (A♠) leads Trick 1.\n` +
      `2. **Must Follow Suit**: You MUST play the led suit if you have it.\n` +
      `3. **Thoko (Cut)**: If void in the led suit, you must play any other suit to CUT.\n` +
      `4. **Pickup**: When cut, the player who played highest card of the led suit picks up all trick cards!\n` +
      `5. **Get Safe**: Empty your hand to win safety. The last player left with cards is the **BHABHI**!`
    );
  }

  // 2. Thoko / Cut explanation
  if (q.includes('thoko') || q.includes('cut') || q === '/cut' || q.includes('katna')) {
    return (
      `⚡ **What is Thoko (Cut)?**\n` +
      `When you have NO cards of the suit being played, you MUST cut with another suit! ` +
      `The trick ends immediately, and the player with the highest card of the led suit has to pick up ALL cards into their hand!`
    );
  }

  // 3. Card counts & standings
  if (
    q.includes('count') ||
    q.includes('cards') ||
    q.includes('who has') ||
    q.includes('standings') ||
    q.includes('kitne card') ||
    q === '/cards'
  ) {
    if (!room.gameState) {
      return `🃏 We are currently in the lobby! Start the match to deal the 52 cards.`;
    }

    const lines = room.gameState.players.map(p => {
      const rp = room.players.find(x => x.seat === p.seat);
      const name = rp?.name || `Seat ${p.seat + 1}`;
      if (p.out) {
        return `• **${name}**: ✓ SAFE (Rank #${p.finishPosition})`;
      }
      return `• **${name}**: **${p.hand.length}** cards ${p.hand.length === 1 ? '⚠️ (LAST CARD!)' : ''}`;
    });

    const discardTotal = room.gameState.discard.length;
    return `📊 **Live Card Count**:\n${lines.join('\n')}\n📦 Discard pile: ${discardTotal} cards`;
  }

  // 4. Whose turn
  if (q.includes('whose turn') || q.includes('turn') || q.includes('kiska') || q === '/turn') {
    if (!room.gameState || room.status !== 'playing') {
      return `⏳ Waiting for host to start the game!`;
    }
    const currentSeat = room.gameState.turnSeat;
    const current = room.players.find(p => p.seat === currentSeat);
    return `👉 It is currently **${current?.name || `Seat ${currentSeat + 1}`}**'s turn to play!`;
  }

  // 5. First Trick / Ace of Spades
  if (q.includes('ace') || q.includes('spade') || q.includes('hukum') || q.includes('first trick')) {
    return (
      `👑 **Ace of Spades (A♠)**:\n` +
      `By official Bhabhi rules, whoever holds the A♠ MUST lead it on Trick 1. ` +
      `No other card can be played as the opening lead!`
    );
  }

  // 6. Hints / Strategy
  if (q.includes('hint') || q.includes('help') || q.includes('advice') || q === '/hint') {
    if (!room.gameState) {
      return `💡 Host can configure custom turn timers (or No Limit) before starting!`;
    }
    const led = room.gameState.trick.ledSuit;
    if (led) {
      return `💡 **Dealer's Advice**: Led suit is ${SUIT_NAMES[led] || led}. Follow suit with your highest card if safe, or dump high cards when someone else might win!`;
    }
    return `💡 **Dealer's Advice**: Try to exhaust suits where you have few cards so you can cut (Thoko) in future tricks!`;
  }

  // 7. Greetings
  if (
    q.includes('hello') ||
    q.includes('hi') ||
    q.includes('hey') ||
    q.includes('namaste') ||
    q.includes('pranam')
  ) {
    return `Namaste ${senderName}! 👑 Welcome to the Bhabhi arena. Ask me anytime for rules, card counts, or advice!`;
  }

  // 8. Banter / Cheering
  if (q.includes('bhabhi') || q.includes('loser') || q.includes('kaun banega')) {
    return `Arey bhai, jo end tak cards sambhal ke baithega wahi Bhabhi banega! Khel pe dhyan do! 😉`;
  }

  if (q.includes('gg') || q.includes('well played') || q.includes('shabash')) {
    return `Shabash ${senderName}! Great spirit! Let's see who clears their hand next! 🃏`;
  }

  // If question was explicitly addressed to bot or starts with slash
  if (q.startsWith('/') || q.includes('bot') || q.includes('pandit') || q.includes('dealer')) {
    return (
      `Namaste ${senderName}! I am your Bhabhi Dealer Bot. ` +
      `You can ask me: **rules**, **cards count**, **thoko**, **whose turn**, or **hint**!`
    );
  }

  return null;
}
