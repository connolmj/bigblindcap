import type { TableTheme } from "../../blackjack/ui/settings";
import { DEFAULT_RULES, type Rules } from "../engine/bets";

export const CHIPS = [5, 10, 25, 100] as const;
export type Chip = (typeof CHIPS)[number];

export interface Settings extends Rules {
  theme: TableTheme;
  chip: Chip;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { ...DEFAULT_RULES, theme: "felt", chip: 5, sound: true };

export const rulesOf = (s: Settings): Rules => ({ odds: s.odds, field12: s.field12, vig: s.vig });
