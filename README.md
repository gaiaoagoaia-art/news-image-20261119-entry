[![make.fun · news-image-20261119](https://make.fun/badge/news-image-20261119.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![rank](https://make.fun/badge/news-image-20261119/gaiaoagoaia-art/news-image-20261119-entry/rank.svg)](https://make.fun/bounty/news-image-20261119/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![reward](https://make.fun/badge/news-image-20261119/gaiaoagoaia-art/news-image-20261119-entry/reward.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)

# The World in One Day — Thursday 19 November 2026

A newspaper front page drawn entirely in code: **three men, one table**.
On Thursday 19 November 2026, Trump, Xi and Putin held the first-ever
US–China–Russia trilateral summit in Shenzhen at APEC — a 90-minute meeting
that produced a joint "peace declaration" with no mention of Ukraine or Iran.
That is the hero. Around it: the day unfolding in sequence, a world map with
numbered pins, and sixteen verified stories from the one day.

## The day, in brief

1. **The summit** — first-ever US–China–Russia trilateral, Shenzhen, APEC.
   90 minutes, a joint peace declaration; nuclear arms control, Ukraine and
   Iran discussed; the declaration mentioned neither.
2. Ukraine strikes the Kerch Bridge a third time in a week; rail halted.
3. Houthi missile damages the PIF Tower in Riyadh.
4. Israeli operation near Nuseirat camp, Gaza, despite the ceasefire.
5. ICJ rules Myanmar committed genocide against the Rohingya (9–6).
6. Anthropic IPO: $83/share, a record ~$81.3B raised.
7. US Senate rejects the Iran war-powers resolution, 51–48.
8. Denmark approves the Greenland defence deal, 109–0.
9. IAEA: North Korea expanding uranium enrichment at Yongbyon.
10. APEC adopts the Shenzhen Outlook on trade, data and AI risks.
11. LPG tanker Gas Husky sinks off Bulgaria.
12. COP31: fossil-fuel phase-out language still unresolved.
13. Bangladesh opposition shutdown; Yunus's ancestral home attacked.
14. Bitcoin dips below $63,000, then recovers; ETF outflows $157.8M.
15. Canada's Carney wraps APEC with China trade gains.
16. Japan PM Takaichi holds talks with Putin.

A date-check box excludes what is *not* this day's news: the GTA VI global
rollout was 18 November. Sources: AP, Reuters, AFP, NYT, IAEA, Hansen Intel,
Just Security, Bangladesh Chronicle, Open Chronicle.

## How it is made

Deterministic procedural TypeScript, Node stdlib only — no clock, no network,
no input files, no `Math.random`. One seeded PRNG (seed `20261119`) with named
sub-streams (grain, flow field, skyline, windows) in a fixed consumption
order, so the render is byte-identical on every run.

- `main.ts` — the scene: editorial front page, BIG OBJECT composition
  (the summit table over the Shenzhen skyline), timeline strip, world map
  with pins, numbered "also today" list, date-check footer.
- `font.ts` — hand-drawn 5×7 block font for all poster text.
- `png.ts` — RGB framebuffer + from-scratch PNG encoder (hand-rolled CRC-32).

Palette (editorial): warm paper `#FAF7F2`, deep ink `#20242C`, oxblood
`#A32035`, emerald `#0D7F63`, ochre `#B07C1F` — 60-30-10, WCAG AA/AAA
contrast throughout. The paper grain and flow-field texture are seeded
generative marks, not flat fills.

## Run it

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/entry.png (1024×1024)
```

Verify determinism:

```bash
MAKEFUN_OUTPUT_DIR=out node main.ts && sha256sum out/entry.png
MAKEFUN_OUTPUT_DIR=out node main.ts && sha256sum out/entry.png
# both runs print the same hash
```

Requires Node 22+ (TypeScript in erasable syntax, run directly by `node`).
