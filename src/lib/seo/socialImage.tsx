import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { PALMS } from "@/components/radio/scene/palmGeometry";

/** Link preview images (Open Graph, X, Discord, WhatsApp …): the sunset scene with the station's line. */

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 } as const;

const HORIZON = 432;
const COLORS = {
  ink: "#0b0618",
  dusk: "#1a0b2e",
  hotPink: "#ff6ec7",
  neonPink: "#ff2fa0",
  orange: "#ff8a3d",
  yellow: "#ffd23f",
  cream: "#fff4e6",
  muted: "#b8a6d9",
  palm: "#12051f",
} as const;

// The site's own fonts (OFL, see src/assets/og-fonts). The image renderer can't read woff2.
const FONT_FILES = [
  { name: "Mr Dafoe", file: "mr-dafoe-latin-400-normal.woff", weight: 400 },
  { name: "Audiowide", file: "audiowide-latin-400-normal.woff", weight: 400 },
  { name: "VT323", file: "vt323-latin-400-normal.woff", weight: 400 },
  { name: "Outfit", file: "outfit-latin-400-normal.woff", weight: 400 },
  { name: "Outfit", file: "outfit-latin-600-normal.woff", weight: 600 },
] as const;

type Font = { name: string; data: Buffer; weight: 400 | 600; style: "normal" };

let fonts: Promise<Font[]> | null = null;

function loadFonts(): Promise<Font[]> {
  fonts ??= Promise.all(
    FONT_FILES.map(async ({ name, file, weight }) => ({
      name,
      weight,
      style: "normal" as const,
      data: await readFile(join(process.cwd(), "src/assets/og-fonts", file)),
    })),
  );
  return fonts;
}

/** Floor grid in perspective: rows close up near the horizon, columns run to a vanishing point. */
function FloorGrid() {
  const width = SOCIAL_IMAGE_SIZE.width;
  const depth = SOCIAL_IMAGE_SIZE.height - HORIZON;
  const rows = [6, 14, 26, 42, 64, 94, 134, 186];
  const columns = Array.from({ length: 25 }, (_, index) => (index - 12) * 160);
  return (
    <svg
      width={width}
      height={depth}
      viewBox={`0 0 ${width} ${depth}`}
      style={{ position: "absolute", left: 0, top: HORIZON }}
    >
      {rows.map((y) => (
        <line key={y} x1={0} y1={y} x2={width} y2={y} stroke={COLORS.neonPink} strokeOpacity={0.55} strokeWidth={2} />
      ))}
      {columns.map((offset) => (
        <line
          key={offset}
          x1={width / 2 + offset / 12}
          y1={0}
          x2={width / 2 + offset * 1.6}
          y2={depth}
          stroke={COLORS.neonPink}
          strokeOpacity={0.45}
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}

function Palm({ left, height }: { left: number; height: number }) {
  const shape = PALMS.tall;
  const width = (height * shape.width) / shape.height;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${shape.width} ${shape.height}`}
      style={{ position: "absolute", left, top: SOCIAL_IMAGE_SIZE.height - height }}
    >
      <g fill={COLORS.palm}>
        <path d={shape.trunk} />
        {shape.fronds.map((d, index) => (
          <path key={index} d={d} />
        ))}
      </g>
    </svg>
  );
}

const STARS = [
  [96, 40, 3],
  [260, 120, 2],
  [430, 28, 2],
  [560, 96, 3],
  [690, 52, 2],
  [820, 30, 2],
  [980, 84, 3],
  [1120, 46, 2],
  [1060, 160, 2],
  [640, 190, 2],
] as const;

const SUN = { left: 740, top: 190, size: 380 };
const SUN_BANDS = [
  [344, 5],
  [368, 7],
  [391, 9],
  [413, 11],
] as const;

type SocialImageProps = {
  /** LCD line above the text, e.g. "107.7 FM · Heatwave" */
  eyebrow: string;
  /** What the page plays */
  line: string;
  /** Colour of the LCD line */
  accent: string;
};

export async function socialImage({ eyebrow, line, accent }: SocialImageProps): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundImage: `linear-gradient(180deg, ${COLORS.ink} 0%, ${COLORS.dusk} 45%, #4a1260 ${HORIZON}px)`,
          fontFamily: "Outfit",
          color: COLORS.cream,
        }}
      >
        {STARS.map(([x, y, r]) => (
          <div
            key={`${x}-${y}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              backgroundColor: COLORS.cream,
              opacity: 0.7,
            }}
          />
        ))}

        <div
          style={{
            position: "absolute",
            left: SUN.left,
            top: SUN.top,
            width: SUN.size,
            height: SUN.size,
            borderRadius: SUN.size / 2,
            backgroundImage: `linear-gradient(180deg, ${COLORS.yellow} 0%, ${COLORS.orange} 52%, ${COLORS.neonPink} 100%)`,
            boxShadow: "0 0 120px 30px rgba(255, 47, 160, 0.45)",
          }}
        />
        {SUN_BANDS.map(([top, height]) => (
          <div
            key={top}
            style={{
              position: "absolute",
              left: SUN.left - 10,
              top,
              width: SUN.size + 20,
              height,
              backgroundColor: "#45115c",
            }}
          />
        ))}

        <div
          style={{
            position: "absolute",
            left: 0,
            top: HORIZON,
            width: "100%",
            height: SOCIAL_IMAGE_SIZE.height - HORIZON,
            backgroundImage: `linear-gradient(180deg, #2a0838 0%, ${COLORS.ink} 100%)`,
          }}
        />
        <FloorGrid />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: HORIZON - 2,
            width: "100%",
            height: 4,
            backgroundColor: COLORS.hotPink,
            boxShadow: `0 0 24px 6px ${COLORS.neonPink}`,
          }}
        />

        <Palm left={850} height={620} />

        <div style={{ position: "absolute", left: 72, top: 54, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <span
              style={{
                fontFamily: "Mr Dafoe",
                fontSize: 156,
                lineHeight: 1,
                color: COLORS.hotPink,
                textShadow: `0 0 18px ${COLORS.neonPink}, 0 0 46px rgba(255, 47, 160, 0.7)`,
                paddingRight: 18,
              }}
            >
              Neon Palms
            </span>
            <span
              style={{
                fontFamily: "VT323",
                fontSize: 52,
                letterSpacing: 10,
                color: COLORS.yellow,
                marginBottom: 26,
              }}
            >
              RADIO
            </span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              alignSelf: "flex-start",
              padding: "4px 16px 2px",
              border: `2px solid ${accent}`,
              borderRadius: 10,
              backgroundColor: "rgba(11, 6, 24, 0.75)",
              fontFamily: "VT323",
              fontSize: 46,
              letterSpacing: 3,
              color: accent,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
          <div style={{ display: "flex", marginTop: 26, maxWidth: 640, fontSize: 40, fontWeight: 600, lineHeight: 1.2 }}>
            {line}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 72,
            bottom: 40,
            display: "flex",
            alignItems: "center",
            fontFamily: "Audiowide",
            fontSize: 26,
            letterSpacing: 2,
            color: COLORS.cream,
          }}
        >
          neonpalms.de
          <span style={{ marginLeft: 18, fontFamily: "Outfit", fontSize: 24, letterSpacing: 0, color: COLORS.muted }}>
            Unofficial GTA VI fan radio · Live 24/7
          </span>
        </div>
      </div>
    ),
    { ...SOCIAL_IMAGE_SIZE, fonts: await loadFonts() },
  );
}
