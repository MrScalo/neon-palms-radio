# Neon Palms FM · 88.6 FM

An unofficial, non-commercial fan web radio with an 80s neon-sunset look: palms, chrome,
synth-pink and cyan. The look is our own and only inspired by the era. The project uses no
third-party logos, names or artwork, and it is not affiliated with YouTube, Google or any artist
or label.

The music plays through YouTube's embedded player. Every track is an official video from the
artist's or label's channel, so everyone can hear the full songs without signing in. Like real
radio, every listener hears the same song at the same moment. Listeners can tune in or out and
change the volume, but they can't skip, seek or pause.

Stack: Next.js 16 (App Router, `cacheComponents`), React 19, TypeScript (strict), Tailwind CSS v4,
Vitest. This Next.js version differs from older ones, so check `node_modules/next/dist/docs/`
before relying on Next.js behaviour you remember.

## Commands

Requires Node.js 20.9 or later. Install with `npm ci`.

| Command                   | What it does                                                         |
| ------------------------- | -------------------------------------------------------------------- |
| `npm run dev`             | Dev server on http://localhost:3000                                  |
| `npm run build`           | Production build                                                     |
| `npm start`               | Serves the production build                                          |
| `npm test`                | Unit tests (Vitest)                                                  |
| `npm run typecheck`       | TypeScript check                                                     |
| `npm run lint`            | ESLint                                                               |
| `npm run verify:playlist` | Checks every track in `src/data/playlist.json` against YouTube (needs internet) |

## How the shared clock works

There is no streaming server and no backend state. Every browser computes the same programme
from the same playlist and the same clock.

- **Station epoch.** `STATION_EPOCH_MS` in `src/lib/radio/schedule.ts` (1 January 2026, 00:00
  UTC) is the moment the station went on air. The time since then is split into cycles. Each
  cycle plays every track exactly once.
- **Per-cycle seeded shuffle.** The cycle number seeds a small integer-only PRNG, so every
  JavaScript engine produces the same order. The order is then adjusted so that no artist plays
  twice in a row, including across the boundary between two cycles. With the track durations
  this gives the exact start and end of every slot (`getSlotAt`, `getUpcoming`).
- **Server clock offset.** `src/lib/radio/clock.ts` asks `/api/time`
  (`src/app/api/time/route.ts`) a few times and keeps the sample with the shortest round trip. It
  uses that sample to compute the offset between the server's clock and the visitor's clock.
  Listeners whose computer clock is wrong still hear the same moment. The clock re-syncs
  periodically and whenever the tab becomes visible again.
- **Drift correction.** `src/hooks/useRadio.ts` checks the player every second. When a slot ends,
  it loads the next video at the live offset. When playback drifts more than a couple of seconds
  from the schedule (buffering, a sleeping tab), it seeks back to the live position.

## Privacy by design

- **Two-click consent.** Until the visitor clicks "Accept & tune in", the player area is only a
  placeholder. The decision is stored in `localStorage` (`neonpalms.consent.v1`, see
  `src/lib/consent.ts`). Visitors can withdraw it under "Privacy settings" in the footer.
- **No third-party requests before consent.** There are no analytics, no CDN, no thumbnails and no
  embeds. "Now playing" and "Up next" come from the local schedule, so they work without YouTube.
- **After consent.** The YouTube IFrame Player API script loads from `www.youtube.com` and the
  player from `www.youtube-nocookie.com` (privacy-enhanced mode). The script requests can still
  set YouTube cookies, and the privacy policy says so. Keep `/privacy` in sync if this changes.
- **Self-hosted fonts.** All fonts come from `next/font`, which downloads them at build time.
  Visitors never contact Google Fonts.
- **YouTube API terms.** The player stays visible (at least 200 × 200 px), and nothing is drawn
  over the iframe.

## Adding or replacing a track

1. Find the **official upload** on the artist's channel (verified artist badge or VEVO) or on the
   label's official channel. Do not use Topic channels, fan uploads or lyric re-uploads.
2. Run `node scripts/verify-videos.mjs <videoId>`. It prints one JSON line with the uploader
   (`author`), `lengthSeconds`, channel badges, embeddability and a `problems` list. `ok` must be
   `true`, except for the "no badge" problem on a label channel (see step 3).
3. Add the track to `src/data/playlist.json`:
   ```json
   { "id": "<videoId>", "artist": "…", "title": "…", "year": 1984, "duration": 238, "channel": "…" }
   ```
   - `duration` must equal `lengthSeconds` **exactly**. It drives the shared schedule.
   - `channel` must equal `author` **exactly**. The site shows it as the "Official video via …"
     credit.
   - Add `officialNote` **only** for a label channel without a verified badge. It explains why
     the channel is official.
4. Run `npm run verify:playlist`. It must report every track as OK.

Any change to `playlist.json`, even reordering it, re-times the whole programme from the station
epoch. Videos can be deleted, blocked or made non-embeddable at any time, so re-run
`npm run verify:playlist` regularly (for example monthly) and replace any track that fails.

## Before you publish

- [ ] Replace every `[…]` placeholder in `src/config/site.ts`: operator name and address, contact
      email, hosting provider name and address, and log retention period.
- [ ] Open `/privacy` and `/imprint` and check that the "Draft" note is gone.
- [ ] Check the hosting section of the privacy policy. If your host processes data outside the
      EU/EEA, add the legal basis for that transfer.
- [ ] Review both legal pages as a whole. The legal notice cites § 18 (1) MStV for a private,
      non-commercial site. If the site becomes commercial, switch to § 5 DDG and add a second
      direct contact channel, such as a phone number.
- [ ] Deploy to a host that runs Node.js (`npm run build` and `npm start`, or a platform with
      full Next.js support). `/api/time` must answer every request live, so a static export
      won't work.
- [ ] If you configure security headers (in `next.config.ts` or at the host), check that they are
      served and still allow the YouTube player.
- [ ] Run `npm run verify:playlist`.
