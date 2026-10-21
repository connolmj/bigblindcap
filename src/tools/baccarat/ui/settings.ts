import type { Speed, TableTheme } from "../../blackjack/ui/settings";
import type { Commission } from "../engine/payouts";

export interface Settings {
  theme: TableTheme;
  commission: Commission;
  /** How fast the third cards come out. */
  speed: Speed;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { theme: "felt", commission: "standard", speed: "normal", sound: true };

/** Milliseconds between steps of the hand — slower than blackjack's dealer so each rule can be read. */
export const STEP_DELAY: Record<Speed, number> = { relaxed: 3200, normal: 2200, fast: 1200 };

/** Milliseconds between the four opening cards. */
export const OPENING_CARD_GAP = 350;

/** After the opening four land, time to read both totals before the first rule plays. */
export const OPENING_PAUSE = 4 * OPENING_CARD_GAP + 1200;
