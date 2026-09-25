/**
 * One round of blackjack, start to finish, as plain data + pure functions.
 *
 * Every function takes a RoundState and returns a *new* RoundState — nothing is
 * mutated. That makes the logic easy to test, and it's exactly the shape
 * React's useReducer wants.
 *
 *   startRound → (applyAction …) → (dealerStep …) → settled
 */
import { cardValue, type Card } from "./cards";
import { handTotal, isNatural, isPair } from "./hand";
import { RULES } from "./rules";
import { recommend, type Action, type Recommendation } from "./strategy";

export type HandStatus = "playing" | "stood" | "bust";
export type Outcome = "blackjack" | "win" | "push" | "lose";

export interface PlayerHand {
  cards: Card[];
  /** Units wagered: 1, or 2 after doubling. */
  bet: number;
  doubled: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  status: HandStatus;
  outcome?: Outcome;
  /** Units won (+) or lost (−) once settled. */
  net?: number;
}

export interface Decision {
  handIndex: number;
  /** Snapshot of the hand when you decided, for the recap. */
  cards: Card[];
  dealerUp: Card;
  chosen: Action;
  recommendation: Recommendation;
  correct: boolean;
}

export type Phase = "player" | "dealer" | "settled";

export interface RoundState {
  shoe: Card[];
  dealer: Card[];
  holeRevealed: boolean;
  hands: PlayerHand[];
  active: number;
  phase: Phase;
  decisions: Decision[];
  /** Set when the round ended before you acted (a natural on either side). */
  natural?: "player" | "dealer" | "both";
  /** Total units won or lost across all hands, once settled. */
  net?: number;
}

// ---------------------------------------------------------------------------
// Dealing

function draw(state: RoundState): [Card, Card[]] {
  if (state.shoe.length === 0) throw new Error("Shoe is empty");
  return [state.shoe[0], state.shoe.slice(1)];
}

function newHand(cards: Card[], fromSplit = false, splitAces = false): PlayerHand {
  return { cards, bet: 1, doubled: false, fromSplit, splitAces, status: "playing" };
}

/**
 * Deal a new round from `shoe`, in real casino order: you, dealer up,
 * you, dealer hole. Then check for naturals.
 */
export function startRound(shoe: Card[]): RoundState {
  const [p1, up, p2, hole, ...rest] = shoe;
  let state: RoundState = {
    shoe: rest,
    dealer: [up, hole],
    holeRevealed: false,
    hands: [newHand([p1, p2])],
    active: 0,
    phase: "player",
    decisions: [],
  };

  const playerBJ = isNatural([p1, p2]);
  const dealerCanPeek = RULES.dealerPeeks && cardValue(up) >= 10;
  const dealerBJ = isNatural([up, hole]) && (dealerCanPeek || playerBJ);

  if (playerBJ || dealerBJ) {
    state = { ...state, natural: playerBJ && dealerBJ ? "both" : playerBJ ? "player" : "dealer" };
    return settle({ ...state, hands: state.hands.map((h) => ({ ...h, status: "stood" as const })) });
  }
  return state;
}

// ---------------------------------------------------------------------------
// Player actions

export function activeHand(state: RoundState): PlayerHand | undefined {
  return state.phase === "player" ? state.hands[state.active] : undefined;
}

export function canDouble(state: RoundState): boolean {
  const hand = activeHand(state);
  if (!hand || hand.cards.length !== 2 || hand.splitAces) return false;
  return !hand.fromSplit || RULES.doubleAfterSplit;
}

export function canSplit(state: RoundState): boolean {
  const hand = activeHand(state);
  if (!hand || !isPair(hand.cards) || state.hands.length >= RULES.maxHands) return false;
  return !(hand.splitAces && !RULES.resplitAces);
}

export function legalActions(state: RoundState): Record<Action, boolean> {
  const playing = !!activeHand(state);
  return { hit: playing, stand: playing, double: canDouble(state), split: canSplit(state) };
}

/** What basic strategy says for the hand you're on right now. */
export function currentRecommendation(state: RoundState): Recommendation | undefined {
  const hand = activeHand(state);
  if (!hand) return undefined;
  return recommend({
    cards: hand.cards,
    dealerUp: state.dealer[0],
    canDouble: canDouble(state),
    canSplit: canSplit(state),
  });
}

/** Take an action on the active hand. Grades it against basic strategy first. */
export function applyAction(state: RoundState, action: Action): RoundState {
  const hand = activeHand(state);
  if (!hand || !legalActions(state)[action]) return state;

  const recommendation = currentRecommendation(state)!;
  const decision: Decision = {
    handIndex: state.active,
    cards: hand.cards,
    dealerUp: state.dealer[0],
    chosen: action,
    recommendation,
    correct: action === recommendation.action,
  };
  let next: RoundState = { ...state, decisions: [...state.decisions, decision] };

  switch (action) {
    case "stand":
      next = updateHand(next, { status: "stood" });
      break;

    case "hit": {
      const [card, shoe] = draw(next);
      next = { ...next, shoe };
      next = updateHand(next, { cards: [...hand.cards, card] });
      next = autoFinish(next);
      break;
    }

    case "double": {
      const [card, shoe] = draw(next);
      const cards = [...hand.cards, card];
      next = { ...next, shoe };
      next = updateHand(next, { cards, bet: hand.bet * 2, doubled: true, status: bustOr(cards, "stood") });
      break;
    }

    case "split": {
      const aces = hand.cards[0].rank === "A";
      const [c1, shoe1] = draw(next);
      const [c2, shoe2] = draw({ ...next, shoe: shoe1 });
      const first = newHand([hand.cards[0], c1], true, aces);
      const second = newHand([hand.cards[1], c2], true, aces);
      // Split aces get one card each and are done. Any split hand that lands on 21 is done too.
      for (const h of [first, second]) {
        if (aces || handTotal(h.cards).total === 21) h.status = "stood";
      }
      const hands = [...next.hands];
      hands.splice(next.active, 1, first, second);
      next = { ...next, shoe: shoe2, hands };
      break;
    }
  }

  return advance(next);
}

function bustOr(cards: Card[], otherwise: HandStatus): HandStatus {
  return handTotal(cards).total > 21 ? "bust" : otherwise;
}

function updateHand(state: RoundState, patch: Partial<PlayerHand>): RoundState {
  const hands = state.hands.map((h, i) => (i === state.active ? { ...h, ...patch } : h));
  return { ...state, hands };
}

/** After a hit: bust ends the hand, and so does reaching 21 (there's nothing to decide). */
function autoFinish(state: RoundState): RoundState {
  const hand = state.hands[state.active];
  const { total } = handTotal(hand.cards);
  if (total > 21) return updateHand(state, { status: "bust" });
  if (total === 21) return updateHand(state, { status: "stood" });
  return state;
}

/** Move to the next hand that still needs a decision, or hand over to the dealer. */
function advance(state: RoundState): RoundState {
  const next = state.hands.findIndex((h) => h.status === "playing");
  if (next !== -1) return { ...state, active: next };

  const allBust = state.hands.every((h) => h.status === "bust");
  const revealed = { ...state, holeRevealed: true, active: -1 };
  // If every hand busted the dealer doesn't need to draw.
  return allBust ? settle(revealed) : { ...revealed, phase: "dealer" };
}

// ---------------------------------------------------------------------------
// Dealer

export function dealerShouldHit(dealer: Card[]): boolean {
  const { total, soft } = handTotal(dealer);
  if (total < 17) return true;
  return total === 17 && soft && RULES.dealerHitsSoft17;
}

/** One step of the dealer's turn: draw a card, or stop and settle. The UI calls this on a timer. */
export function dealerStep(state: RoundState): RoundState {
  if (state.phase !== "dealer") return state;
  if (!dealerShouldHit(state.dealer)) return settle(state);
  const [card, shoe] = draw(state);
  return { ...state, shoe, dealer: [...state.dealer, card] };
}

/** Run the dealer to completion (used by tests and "skip animation"). */
export function finishDealer(state: RoundState): RoundState {
  let s = state;
  while (s.phase === "dealer") s = dealerStep(s);
  return s;
}

// ---------------------------------------------------------------------------
// Settling bets

function settle(state: RoundState): RoundState {
  const dealerTotal = handTotal(state.dealer).total;
  const dealerBJ = isNatural(state.dealer);
  const dealerBust = dealerTotal > 21;

  const hands = state.hands.map((h): PlayerHand => {
    const { total } = handTotal(h.cards);
    // Only an unsplit two-card 21 is a blackjack.
    const playerBJ = !h.fromSplit && isNatural(h.cards);
    let outcome: Outcome;
    if (total > 21) outcome = "lose";
    else if (playerBJ && dealerBJ) outcome = "push";
    else if (playerBJ) outcome = "blackjack";
    else if (dealerBJ) outcome = "lose";
    else if (dealerBust || total > dealerTotal) outcome = "win";
    else if (total === dealerTotal) outcome = "push";
    else outcome = "lose";

    const net =
      outcome === "blackjack"
        ? h.bet * RULES.blackjackPays
        : outcome === "win"
          ? h.bet
          : outcome === "lose"
            ? -h.bet
            : 0;
    return { ...h, outcome, net };
  });

  const net = hands.reduce((sum, h) => sum + (h.net ?? 0), 0);
  return { ...state, hands, net, phase: "settled", holeRevealed: true, active: -1 };
}
