# Big Blind Capital — bigblindcap.com

The whole site as one React + TypeScript app: **Home** (total book), **Sports**
(picks ledger), **Portfolio** (stocks, crypto & cash positions, research library) and
**Tools** — *Level 1: Basic Blackjack Strategy* and the *NFL Survivor Grid*.

Sports and Portfolio read live from the Google Sheet (tabs: picks, `Equities`,
and optional `History`). Update the sheet and the site updates — no redeploy.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173 — reloads as you edit
npm test           # engine unit tests (Vitest)
npm run build      # type-check + production build into dist/
```

## Deploying (Cloudflare Pages)

One-time setup:

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick this repo.
2. Production branch `main`, framework preset **None**, build command `npm run build`,
   build output directory `dist`. Node 22 comes from `.nvmrc`.
3. After the first deploy: the project → **Custom domains** → add `bigblindcap.com`
   (and `www`), then follow the DNS prompts.

After that, every push to `main` redeploys automatically.

Redirects live in `public/_redirects`. Any path that isn't a real file serves
`index.html`, so React Router handles `/tools/blackjack` etc.

## Where things live

```
public/
  docs/                 Research PDFs linked from Portfolio → Library
  media/                Home page clip
  _redirects            Old URLs → new ones (Cloudflare Pages)
  og-image.png          Link-preview image for X / iMessage / Slack
src/
  data/                 Google Sheet loading + all the book math (tested)
  site/                 Header, nav, footer shared by every page
  pages/home/           Total book
  pages/sports/         Picks ledger
  pages/portfolio/      Book, allocation donut + holdings, library (add PDFs here)
  pages/tools/          Tools index and page wrappers
  tools/survivor/
    model/              Ratings, win %, pick % estimate, season planner (tested)
    ui/                 The Survivor Grid page
  tools/blackjack/
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

## NFL Survivor Grid data

`public/data/survivor.json` is rebuilt from the free [nflverse](https://github.com/nflverse/nfldata)
schedule/odds file by `scripts/update-survivor.ts`. A GitHub Action
(`.github/workflows/update-survivor.yml`) runs it every morning and
commits the file when the numbers change, which triggers a Cloudflare Pages deploy.
Run it by hand any time with `npm run update-survivor`, or from the repo's
**Actions** tab → *Update survivor data* → *Run workflow*.
