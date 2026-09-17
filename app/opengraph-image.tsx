import { ImageResponse } from "next/og";

// Dynamic social preview image: https://www.deviq.online/opengraph-image
// 1200x630, edge-rendered, no static asset to maintain.

export const runtime = "edge";
export const alt = "DevIQ — Developer Analytics Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0A0A0A",
          color: "#FAFAFA",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em" }}>
          DevIQ
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 58,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            maxWidth: 900,
          }}
        >
          Your developer profile, fully measured.
        </div>
        <div style={{ marginTop: 20, fontSize: 26, color: "#A3A3A3" }}>
          GitHub · LeetCode · Codeforces — one unified dev score
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 22,
            color: "#FAFAFA",
          }}
        >
          <div
            style={{
              background: "#FAFAFA",
              color: "#0A0A0A",
              borderRadius: 10,
              padding: "12px 28px",
              fontWeight: 700,
            }}
          >
            www.deviq.online
          </div>
          <div style={{ color: "#A3A3A3" }}>Free · No signup to try</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
