import { NextResponse } from "next/server";
import { featured, formatFor } from "@/lib/resume-examples/data";
import { COUNTRY_CODES, type CountryCode } from "@/lib/resume-examples/types";

/** Up to 12 samples for the home page's country/category filters. Static data, cached. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const country = (COUNTRY_CODES as readonly string[]).includes(sp.get("country") ?? "") ? (sp.get("country") as CountryCode) : "us";
  const category = sp.get("category") || undefined;
  return NextResponse.json({ format: formatFor(country), samples: featured(country, category) }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
