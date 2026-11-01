type Star = { x: number; y: number; size: number; opacity: number; layer: 0 | 1 | 2 };

/** Small seeded PRNG: the sky looks random but renders identically on every server and client. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeStars(seed: number, count: number): Star[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => {
    const x = rand() * 100;
    // Squaring biases stars towards the top, where the sky is darkest.
    const y = rand() ** 2 * 100;
    const size = rand() < 0.12 ? 2.5 : rand() < 0.5 ? 1.5 : 1;
    const opacity = 0.35 + rand() * 0.6;
    const roll = rand();
    const layer: Star["layer"] = roll < 0.18 ? 1 : roll < 0.34 ? 2 : 0;
    return { x, y, size, opacity, layer };
  });
}

const STARS = makeStars(886, 70);
const LAYERS = ["", "np-twinkle-a", "np-twinkle-b"] as const;

export function StarField() {
  return (
    <div className="np-stars">
      {LAYERS.map((animation, layer) => (
        <div key={layer} className={`absolute inset-0 ${animation}`}>
          {STARS.filter((star) => star.layer === layer).map((star, i) => (
            <span
              key={i}
              className="np-star"
              style={{
                left: `${star.x.toFixed(2)}%`,
                top: `${star.y.toFixed(2)}%`,
                width: star.size,
                height: star.size,
                opacity: Number(star.opacity.toFixed(2)),
                boxShadow: star.size > 2 ? "0 0 6px rgb(255 244 230 / 0.8)" : undefined,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
