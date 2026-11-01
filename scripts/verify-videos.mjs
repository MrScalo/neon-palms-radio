#!/usr/bin/env node
// Verifies YouTube video IDs for the radio playlist.
// Usage: node scripts/verify-videos.mjs <videoId> [<videoId> ...]   → one JSON object per line
//        node scripts/verify-videos.mjs --playlist                  → checks src/data/playlist.json
//          (also compares the stored duration with YouTube's lengthSeconds and the stored channel
//          with the uploader's name; exits 1 on any problem)
// Checks: owner channel + badges (official artist / verified), duration, embeddability
// (watch-page flag AND an embedded-player playability probe), age gate, DE availability.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  "Accept-Language": "en-US,en;q=0.9",
  Cookie: "SOCS=CAI; CONSENT=YES+1",
};

function extractJson(html, marker) {
  const i = html.indexOf(marker);
  if (i < 0) return null;
  let start = html.indexOf("{", i);
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = start; j < html.length; j++) {
    const c = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, j + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function findOwnerBadges(initialData) {
  const contents =
    initialData?.contents?.twoColumnWatchNextResults?.results?.results?.contents ?? [];
  for (const c of contents) {
    const owner = c?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer;
    if (owner) {
      const badges = (owner.badges ?? []).map(
        (b) => b?.metadataBadgeRenderer?.style ?? "UNKNOWN",
      );
      const subs = owner?.subscriberCountText?.simpleText ?? null;
      const handle =
        owner?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl ?? null;
      return { badges, subs, handle };
    }
  }
  return { badges: [], subs: null, handle: null };
}

async function embedProbe(videoId) {
  // The /embed page carries a "previewPlayabilityStatus" for third-party embeds.
  try {
    const res = await fetch(`https://www.youtube.com/embed/${videoId}`, {
      headers: { ...HEADERS, Referer: "https://example.com/" },
    });
    const html = (await res.text()).replace(/\\"/g, '"');
    const m = html.match(/"previewPlayabilityStatus":\{"status":"(\w+)"(?:,"reason":"([^"]*)")?(?:,"playableInEmbed":(true|false))?/);
    if (!m) return { status: `NO_STATUS_HTTP_${res.status}`, reason: null, playableInEmbed: null };
    return { status: m[1], reason: m[2] ?? null, playableInEmbed: m[3] === undefined ? null : m[3] === "true" };
  } catch (e) {
    return { status: "PROBE_FAILED", reason: String(e), playableInEmbed: null };
  }
}

async function verify(videoId) {
  const out = { videoId, ok: false, problems: [] };
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en&gl=DE`, {
      headers: HEADERS,
    });
    const html = await res.text();
    const pr = extractJson(html, "var ytInitialPlayerResponse");
    const idata = extractJson(html, "var ytInitialData");
    if (!pr) {
      out.problems.push("no player response");
      return out;
    }
    const vd = pr.videoDetails ?? {};
    const mf = pr.microformat?.playerMicroformatRenderer ?? {};
    const ps = pr.playabilityStatus ?? {};
    const owner = findOwnerBadges(idata);
    const countries = mf.availableCountries ?? [];
    const embed = await embedProbe(videoId);

    Object.assign(out, {
      title: vd.title,
      author: vd.author,
      channelId: vd.channelId,
      handle: owner.handle,
      subscribers: owner.subs,
      ownerBadges: owner.badges,
      officialArtistChannel: owner.badges.includes("BADGE_STYLE_TYPE_VERIFIED_ARTIST"),
      verifiedChannel: owner.badges.some((b) => b.startsWith("BADGE_STYLE_TYPE_VERIFIED")),
      lengthSeconds: Number(vd.lengthSeconds),
      category: mf.category,
      publishDate: mf.publishDate,
      isUnlisted: mf.isUnlisted ?? null,
      isLive: vd.isLiveContent ?? false,
      watchPlayability: ps.status,
      watchReason: ps.reason ?? null,
      playableInEmbed: ps.playableInEmbed ?? null,
      embedProbe: embed,
      isFamilySafe: mf.isFamilySafe ?? null,
      availableIn: Object.fromEntries(
        ["DE", "AT", "CH", "US", "GB"].map((c) => [c, countries.length === 0 || countries.includes(c)]),
      ),
      countryCount: countries.length,
    });

    if (ps.status !== "OK") out.problems.push(`watch playability ${ps.status}: ${ps.reason ?? ""}`);
    if (ps.playableInEmbed !== true) out.problems.push("playableInEmbed is not true");
    if (embed.status !== "OK" || embed.playableInEmbed === false)
      out.problems.push(`embed probe ${embed.status}: ${embed.reason ?? ""}`);
    if (mf.isFamilySafe === false) out.problems.push("not family safe (age gate risk)");
    if (!out.availableIn.DE) out.problems.push("not available in DE");
    if (out.isLive) out.problems.push("live content");
    if (!out.verifiedChannel) out.problems.push("channel not verified (no badge)");
    if (vd.author && / - Topic$/.test(vd.author)) out.problems.push("auto-generated Topic channel");
    if (!(out.lengthSeconds >= 120 && out.lengthSeconds <= 600))
      out.problems.push(`length ${out.lengthSeconds}s outside 120..600`);
    out.ok = out.problems.length === 0;
  } catch (e) {
    out.problems.push(`fetch failed: ${e}`);
  }
  return out;
}

const args = process.argv.slice(2);

if (args[0] === "--playlist") {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../src/data/playlist.json", import.meta.url);
  const { tracks } = JSON.parse(await readFile(url, "utf8"));
  let failures = 0;
  const seen = new Set();
  for (const t of tracks) {
    const r = await verify(t.id);
    if (seen.has(t.id)) r.problems.push("duplicate id in playlist");
    seen.add(t.id);
    if (r.lengthSeconds && r.lengthSeconds !== t.duration)
      r.problems.push(`duration mismatch: playlist ${t.duration}s, YouTube ${r.lengthSeconds}s`);
    // The site shows `channel` as the official-source credit, so it must name the real uploader.
    if (r.author && r.author !== t.channel)
      r.problems.push(`channel mismatch: playlist "${t.channel}", YouTube "${r.author}"`);
    // Badge-less label channels are allowed when the playlist documents why.
    if (t.officialNote) r.problems = r.problems.filter((p) => p !== "channel not verified (no badge)");
    const ok = r.problems.length === 0;
    if (!ok) failures++;
    console.log(`${ok ? "OK  " : "FAIL"} ${t.id}  ${t.artist} – ${t.title}  [${r.author ?? "?"}]${ok ? "" : "  → " + r.problems.join("; ")}`);
    await new Promise((res) => setTimeout(res, 400));
  }
  console.log(`\n${tracks.length - failures}/${tracks.length} tracks OK`);
  process.exit(failures ? 1 : 0);
}

if (args.length === 0) {
  console.error("usage: node scripts/verify-videos.mjs <videoId> [...] | --playlist");
  process.exit(1);
}
for (const id of args) {
  console.log(JSON.stringify(await verify(id)));
  await new Promise((r) => setTimeout(r, 400));
}
