import type { TableTheme } from "../../blackjack/ui/settings";
import type { Commission } from "../engine/payouts";
import type { DealMode } from "../engine/scenario";

export interface Settings {
  theme: TableTheme;
  dealMode: DealMode;
  commission: Commission;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { theme: "felt", dealMode: "focus", commission: "standard", sound: true };
