import { describe, expect, it } from "vitest";
import { DEMO_RESUME_TEXT } from "@/lib/demo-resume";
import { buildMatchContext, scoreJob } from "@/lib/jobs/rank";
import { parseResumeHeuristically } from "@/lib/resume/heuristic";
import { defaultPreferences } from "@/lib/resume/schema";

describe("ranking performance", () => {
  it("scores 600 realistic listings quickly", () => {
    const ctx = buildMatchContext(parseResumeHeuristically(DEMO_RESUME_TEXT), defaultPreferences());
    const description = "We are looking for an engineer with React, TypeScript, Node.js, AWS and Kubernetes. ".repeat(60);
    const t = performance.now();
    for (let i = 0; i < 600; i++)
      scoreJob({ source: "t", externalId: String(i), title: `Senior Engineer ${i}`, company: "Acme", location: "Berlin", workMode: "hybrid", employmentType: "", salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null, description, url: "", postedAt: new Date() }, ctx);
    const ms = performance.now() - t;
    console.info(`600 jobs scored in ${Math.round(ms)}ms`);
    expect(ms).toBeLessThan(3000);
  });
});
