# Big Blind Capital — bigblindcap.com

The whole site as one React + TypeScript app: **Sports** (picks ledger fed from a
Google Sheet), **Equities**, and **Games** — starting with
*Level 1: Basic Blackjack Strategy*.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173 — reloads as you edit
npm test           # engine unit tests (Vitest)
npm run build      # type-check + production build into dist/
```

## Deploying (Netlify)

`netlify.toml` tells Netlify how to build. One-time setup:

1. Netlify → **Add new site → Import an existing project** → pick this GitHub repo.
2. Build command and publish directory come from `netlify.toml` (`npm run build`, `dist`).
3. Move the `bigblindcap.com` domain from the old site to this one (Site settings → Domain management).

After that, every push to the production branch redeploys automatically, and every
pull request gets its own preview URL.

## Where things live

```
src/
  site/                 Header, nav, footer shared by every page
  pages/sports/         Sports page + ledger.ts (Google Sheet → numbers)
  pages/games/          Games index and the Blackjack page wrapper
  games/blackjack/
    engine/             Pure TypeScript — no React. The rules of the game.
      rules.ts          Table rules (6 decks, S17, DAS, 3:2)
      cards.ts          Cards, shoe, shuffle, seeded RNG
      hand.ts           Hand totals (hard/soft), naturals, pairs
      strategy.ts       Basic strategy charts + recommend()
      explain.ts        The "why" text for every decision
      round.ts          A full round as a state machine: deal → act → dealer → settle
      scenario.ts       "Tough spots" dealing vs. a real shoe
      *.test.ts         Tests for all of the above
    ui/                 React components + blackjack.css
      useTrainer.ts     The one hook that connects the engine to React
```

The engine/UI split is deliberate: Level 2 (card counting) can reuse the engine
with a persistent shoe instead of a fresh one each hand.
