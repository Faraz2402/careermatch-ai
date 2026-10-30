import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { jsonError } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEMO_RESUME_TEXT } from "@/lib/demo-resume";
import { saveParsedProfile } from "@/lib/profile";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { parseResumeHeuristically } from "@/lib/resume/heuristic";
import { defaultPreferences } from "@/lib/resume/schema";

/** "Try demo": a throwaway account pre-filled with a fictional resume. */
export async function POST(req: Request) {
  if (!(await rateLimit(`demo:${clientIp(req)}`, 5, 60 * 60_000)).ok) return jsonError("Too many demo sessions. Try again later.", 429);
  const id = randomBytes(6).toString("hex");
  const user = await db.user.create({
    data: {
      email: `demo-${id}@demo.careermatch.local`,
      name: "Demo user",
      isDemo: true,
      passwordHash: await hashPassword(randomBytes(24).toString("hex")),
    },
  });
  // The demo uses the deterministic parser so it is instant and free.
  const data = parseResumeHeuristically(DEMO_RESUME_TEXT);
  await saveParsedProfile(user.id, data, DEMO_RESUME_TEXT, "heuristic");
  await db.preferences.create({
    data: {
      userId: user.id,
      data: JSON.stringify({
        ...defaultPreferences(),
        roles: ["Senior Full-Stack Engineer", "Senior Frontend Engineer"],
        seniority: "senior",
        locations: ["Austin, TX"],
        workModes: ["remote", "hybrid"],
        salaryMin: 140000,
      }),
    },
  });
  await createSession(user.id);
  return NextResponse.json({ ok: true, redirect: "/dashboard" });
}
