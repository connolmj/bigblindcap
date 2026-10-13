import type { Speed, TableTheme } from "../../blackjack/ui/settings";
import type { PairPlusTable } from "../engine/paytable";
import type { DealMode } from "../engine/scenario";

export interface Settings {
  theme: TableTheme;
  dealMode: DealMode;
  /** "off" for no Pair Plus bet. */
  pairPlus: PairPlusTable | "off";
  speed: Speed;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "felt",
  dealMode: "focus",
  pairPlus: "1-4-6-30-40",
  speed: "normal",
  sound: true,
};

/** Milliseconds between the dealer's cards turning over. */
export const REVEAL_DELAY: Record<Speed, number> = { relaxed: 800, normal: 520, fast: 260 };
