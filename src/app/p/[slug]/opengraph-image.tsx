import { ImageResponse } from "next/og";
import { getProfileBySlug } from "@/lib/profile";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "CareerMatch AI profile";

const GRADIENT: Record<string, string> = {
  aurora: "linear-gradient(135deg, #4338ca, #4f46e5 50%, #6d28d9)",
  sunset: "linear-gradient(135deg, #f97316, #f43f5e 50%, #c026d3)",
  minimal: "linear-gradient(135deg, #0f172a, #1e293b)",
};

/** Link-preview card. Shows only name + headline, and only for public profiles. */
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProfileBySlug((await params).slug);
  const visible = p?.isPublic;
  const name = visible ? p!.data.name : "CareerMatch AI";
  const headline = visible ? p!.data.headline : "Turn your resume into a smarter job search";
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, color: "white", background: GRADIENT[p?.theme ?? "aurora"] ?? GRADIENT.aurora }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div style={{ width: 160, height: 160, borderRadius: 32, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, fontWeight: 800 }}>{initials}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{name}</div>
            <div style={{ fontSize: 36, opacity: 0.85, marginTop: 12 }}>{headline}</div>
          </div>
        </div>
        <div style={{ fontSize: 28, opacity: 0.8 }}>CareerMatch AI · Professional profile</div>
      </div>
    ),
    size,
  );
}
