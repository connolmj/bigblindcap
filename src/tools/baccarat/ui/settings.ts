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
