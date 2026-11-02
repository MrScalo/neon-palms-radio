import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BANDS = [
  [104, 5],
  [118, 7],
  [132, 9],
] as const;

/** Home screen icon: the striped sunset sun on the night sky. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundImage: "linear-gradient(180deg, #0b0618 0%, #3b0f4f 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 30,
            top: 30,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundImage: "linear-gradient(180deg, #ffd23f 0%, #ff8a3d 50%, #ff2fa0 100%)",
            boxShadow: "0 0 40px 6px rgba(255, 47, 160, 0.55)",
          }}
        />
        {BANDS.map(([top, height]) => (
          <div
            key={top}
            style={{ position: "absolute", left: 24, top, width: 132, height, backgroundColor: "#2a0c3f" }}
          />
        ))}
      </div>
    ),
    size,
  );
}
